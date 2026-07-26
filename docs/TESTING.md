# Test and Development Database Setup

The refactor workflow (see `docs/REFACTOR_PLAN.md`) never touches the QNAP
database. It uses two throwaway local PostgreSQL containers:

| Purpose     | Compose file             | Host port | Database     | Env file    |
|-------------|--------------------------|-----------|--------------|-------------|
| Automated tests | `docker-compose.test.yml` | 127.0.0.1:55432 | `forum_test` | `.env.test` |
| Local development | `docker-compose.dev.yml`  | 127.0.0.1:55433 | `forum_dev`  | `.env.dev`  |

The legacy `docker-compose.yml` (port 5433) and the normal `.env` (QNAP) are
not used by any refactor command.

## One-time setup

```bash
cp .env.test.example .env.test
cp .env.dev.example .env.dev
docker compose -f docker-compose.test.yml up -d --wait
docker compose -f docker-compose.dev.yml up -d --wait
```

Do not copy any value from the normal `.env` into `.env.test` or `.env.dev`.

## Safety rules (enforced, not advisory)

Every database command in the refactor workflow goes through the fail-closed
guard in `packages/db/src/safe-target.ts`:

- `POSTGRES_HOST` must be `localhost` or `127.0.0.1`.
- The database name must end in `_test` (test commands) or `_dev`
  (dev commands) — exactly matching the command's mode.
- Test commands additionally refuse a target equal to the normal `.env`
  target.
- There is **no** environment-variable override for these checks.

## Commands

```bash
# Migrations (safe wrappers; never use db:migrate for the refactor workflow)
pnpm --filter @forum/db db:migrate:test
pnpm --filter @forum/db db:migrate:dev
pnpm --filter @forum/db db:generate:dev
pnpm --filter @forum/db db:seed:dev

# Tests
pnpm test              # unit tests (no database)

pnpm test:integration  # serial integration tests against forum_test
pnpm test:e2e          # Playwright against forum_test (starts its own servers)
```

Integration tests run serially against one `forum_test` database: one global
bootstrap and migration, then truncation between tests. Never run two
commands that migrate or truncate `forum_test` at the same time.

The test container keeps its data on tmpfs: stopping it wipes `forum_test`,
which is intended. The dev container uses a persistent volume.

## Legacy bootstrap

The committed migration history starts from a database that already had the
forum tables (`0000` alters `categories`). `db:migrate:test` therefore applies
`packages/db/sql/legacy-bootstrap.sql` (the exact pre-`0000` schema) first —
but only when the safety-checked test database is completely empty. The
migration smoke test in `packages/db/tests/integration/` proves
empty database → bootstrap → full history → a structure identical to what
`drizzle-kit push` produces from today's `schema.ts`.
