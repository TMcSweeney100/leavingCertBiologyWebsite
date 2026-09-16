#!/usr/bin/env bash
# Starts a throwaway database and a fresh backend and frontend on unusual ports, seeds one teacher
# with the operator CLI, runs the Playwright journey, and tears everything down.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

E2E_DB_URL="jdbc:postgresql://localhost:55433/coursework_e2e"
BACKEND_PORT=8081
FRONTEND_PORT=3100
PROXY_SECRET="e2e-proxy-secret"
LOG_DIR="frontend/test-results"
mkdir -p "$LOG_DIR"

# A server left on either port would answer the readiness checks below and the journey would run
# against stale code, so refuse to start rather than test the wrong build.
for port in $BACKEND_PORT $FRONTEND_PORT; do
  if lsof -ti "tcp:$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "e2e: port $port is already in use (a server left from an earlier run?); stop it and retry"
    exit 1
  fi
done

cleanup() {
  echo "e2e: tearing down"
  [ -n "${NEXT_PID:-}" ] && kill "$NEXT_PID" 2>/dev/null || true
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null || true
  # The PIDs above are subshells; `npx next start` leaves next-server running without this. The
  # ports were free at start, so whatever listens on them now is ours.
  for port in $BACKEND_PORT $FRONTEND_PORT; do
    lsof -ti "tcp:$port" -sTCP:LISTEN 2>/dev/null | xargs kill 2>/dev/null || true
  done
  docker compose --profile e2e down postgres-e2e -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "e2e: database"
docker compose --profile e2e up -d postgres-e2e
until [ "$(docker inspect -f '{{.State.Health.Status}}' coursework-postgres-e2e 2>/dev/null)" = "healthy" ]; do sleep 1; done

echo "e2e: backend jar"
(cd backend && ./mvnw --quiet -DskipTests package)
JAR="$(ls backend/target/coursework-backend-*.jar | head -1)"

# The operator process reads the same DATABASE_* variables as the server (application.yaml).
operator() {
  DATABASE_URL="$E2E_DB_URL" DATABASE_USERNAME=coursework DATABASE_PASSWORD=coursework \
    java -jar "$JAR" operator "$@"
}

echo "e2e: seed teacher"
TEMP_PASSWORD="$(operator create-user --first-name=E2E --last-name=Teacher --username=e2e.teacher 2>/dev/null \
  | sed -n 's/.*Temporary password (shown once): //p')"
operator create-school --name="E2E Educate Together Secondary School" --short-name="E2E School" --roll=99999E >/dev/null 2>&1
operator grant-role --username=e2e.teacher --roll=99999E --role=TEACHER >/dev/null 2>&1
[ -n "$TEMP_PASSWORD" ] || { echo "e2e: no temporary password captured"; exit 1; }

echo "e2e: backend on :$BACKEND_PORT"
DATABASE_URL="$E2E_DB_URL" DATABASE_USERNAME=coursework DATABASE_PASSWORD=coursework \
  SERVER_PORT=$BACKEND_PORT APP_COOKIE_SECURE=false PROXY_SHARED_SECRET="$PROXY_SECRET" \
  java -jar "$JAR" > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
until curl -sf "http://127.0.0.1:$BACKEND_PORT/actuator/health" >/dev/null; do sleep 1; done

# APP_ENABLED is read at build time for prerendered routes, so it's set on the build as well as the start.
echo "e2e: frontend on :$FRONTEND_PORT"
(cd frontend && APP_ENABLED=true BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" PROXY_SHARED_SECRET="$PROXY_SECRET" \
  npm run build >"../$LOG_DIR/next-build.log" 2>&1)
(cd frontend && APP_ENABLED=true BACKEND_INTERNAL_URL="http://127.0.0.1:$BACKEND_PORT" PROXY_SHARED_SECRET="$PROXY_SECRET" \
  npx next start -p $FRONTEND_PORT >"../$LOG_DIR/next.log" 2>&1) &
NEXT_PID=$!
until curl -sf "http://localhost:$FRONTEND_PORT/login" >/dev/null; do sleep 1; done

echo "e2e: playwright"
(cd frontend && E2E_TEACHER_PASSWORD="$TEMP_PASSWORD" npm run test:e2e)
