.PHONY: help verify e2e db-up db-down db-logs backend-test backend-verify backend-run \
        frontend-install frontend-lint frontend-typecheck frontend-test frontend-build frontend-run clean

help:
	@echo "Coursework pilot"
	@echo ""
	@echo "  make db-up               Start PostgreSQL 18"
	@echo "  make db-down             Stop PostgreSQL"
	@echo "  make backend-test        Backend tests (needs Docker)"
	@echo "  make backend-run         Spring Boot on :8080"
	@echo "  make frontend-run        Next.js on :3000"
	@echo "  make verify              Backend tests, frontend lint, types, tests, build"
	@echo "  make e2e                 Playwright journey (needs Docker; slow)"

# The frontend build runs last: it's the slowest, and a type or test failure should show first.
verify: backend-verify frontend-lint frontend-typecheck frontend-test frontend-build
	@echo ""
	@echo "verify: all checks passed"

e2e:
	./scripts/e2e.sh

db-up:
	docker compose up -d postgres
	@until [ "$$(docker inspect -f '{{.State.Health.Status}}' coursework-postgres 2>/dev/null)" = "healthy" ]; do sleep 1; done
	@echo "PostgreSQL is ready on localhost:5432"

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

backend-test:
	cd backend && ./mvnw test

backend-verify:
	cd backend && ./mvnw verify

backend-run:
	cd backend && ./mvnw spring-boot:run

frontend-install:
	cd frontend && npm ci

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npm run typecheck

frontend-test:
	cd frontend && npm test

frontend-build:
	cd frontend && npm run build

frontend-run:
	cd frontend && npm run dev

clean:
	cd backend && ./mvnw clean
	rm -rf frontend/.next frontend/test-results frontend/playwright-report
