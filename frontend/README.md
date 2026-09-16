# frontend

One Next.js 15 app serving two things: the public BiPi schedule at `/[class]` and the Leaving Cert coursework pilot under `app/(app)` and `app/(auth)`, which proxies to the Spring API in `../backend`.

- Public schedule: read `BIPI-SITE-NOTES.md` first.
- Pilot app: read the root `CLAUDE.md`, then `docs/ARCHITECTURE.md`; UI rules in `docs/design/`.
- Commands from the repo root: `make frontend-run` (needs `.env.local`, see `.env.example`), `make verify`, `make e2e`.
