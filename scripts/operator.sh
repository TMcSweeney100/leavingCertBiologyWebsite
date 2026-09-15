#!/usr/bin/env bash
# Runs an operator command against the database in DATABASE_URL (default: local compose database).
#
#   scripts/operator.sh create-school --name="…" --roll=76543A
#
# Against a deployed database, run the same image the host runs with `operator …` as its arguments
# instead, so the command uses the production secrets and never leaves the host's network.
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/backend"

jar="$(ls target/coursework-backend-*.jar 2>/dev/null | head -1 || true)"
if [ -z "$jar" ] || [ -n "$(find src pom.xml -newer "$jar" -print -quit)" ]; then
  ./mvnw --quiet -DskipTests package
  jar="$(ls target/coursework-backend-*.jar | head -1)"
fi

exec java -jar "$jar" operator "$@"
