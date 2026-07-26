# Forum

An internet forum: one arbitrary-depth hierarchy of **boards**, each holding
topics, each topic holding a discussion. A root board is presented as a
*category*, any nested board as a *subcategory* — that is a presentation rule,
not two different things in the database.

Monorepo layout:

| Path              | Contents                                                     |
|-------------------|--------------------------------------------------------------|
| `apps/forum`      | SolidJS + TanStack Start frontend                            |
| `packages/api`    | Hono API: domain modules, route adapters, Better Auth        |
| `packages/db`     | Drizzle schema, migrations, safety wrappers, dev seed        |
| `packages/ui`     | Shared components                                            |
| `packages/config` | Shared TypeScript configs                                    |
| `e2e`             | Playwright browser tests                                     |

## Architecture

The API is organised as **deep domain modules**, not as logic spread across
route files. Each module in `packages/api/src/modules/` owns one area:

| Module             | Owns                                                        |
|--------------------|-------------------------------------------------------------|
| `topic-discussion` | Topic creation, replies, edits, soft deletes, view counting |
| `forum-read`       | Page-oriented reads: index, category, board, topic          |
| `board-management` | Admin board create/update/move/recursive purge              |
| `profile-edit`     | Profile read and replacement save, avatar                   |
| `profile-activity` | A user's own posts, with canonical links                    |
| `interaction-write`| Reactions and votes                                         |
| `shared`           | Errors, pagination cursors, quote snapshots, locks, hierarchy |

Rules that hold throughout:

- **Route adapters do four things only**: validate input, extract the actor,
  invoke a module, map the result to HTTP. No adapter opens a database handle.
- **Modules receive an injected, transaction-scoped store.** They never reach
  for a global connection, and they expose no Drizzle, Hono, or Solid types.
- **Route policy lives in one place per side.** Breadcrumbs and canonical route
  params come from `modules/shared/board-hierarchy.ts` on the server, and
  `features/forum-read/topic-link.ts` maps them to typed links in the UI.
  Nothing reconstructs a URL from slugs.

### Canonical URLs

The backend decides where a topic lives; the frontend only renders what it is
given. A topic on a **root** board uses the category path, and a topic on any
**nested** board uses the UUID-addressed board path:

```text
/                                                          forum index
/categories/$categorySlug                                  root board
/categories/$categorySlug/subcategories/$boardId           nested board
/categories/$categorySlug/topics/$topicSlug                topic on a root board
/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug
/admin/boards                                              board administration
/profile                                                   profile and activity
```

Nested boards are addressed by id rather than by an ancestry path because the
hierarchy has no depth limit and boards can be moved. Topic slugs are globally
unique (`lower(slug)`), so a topic resolves without its board.

### Error envelope

Module-backed endpoints answer failures with one shape:

```jsonc
{ "error": { "code": "TOPIC_SLUG_CONFLICT", "message": "…", "field": "title" } }
```

Status mapping: `400` validation, `401` unauthenticated, `403` forbidden or
locked topic, `404` missing board/topic/post, `409` conflict, cycle, or stale
purge impact. Admin routes deliberately answer `403` for both a missing and a
non-admin actor, so they never reveal that authentication alone would suffice.

`/api/reactions` and `/api/votes` keep their original `{ "error": "…" }` shape.
Redesigning reactions and votes was an explicit non-goal; the split is
intentional and permanent, not migration debt.

### Pagination

Lists use **versioned keyset cursors**, never offsets. A cursor is an opaque
base64url string; clients pass back what they were given and never construct
one. The default page is 25 items and the maximum is 100.

```text
GET /api/forum/categories/general?topicCursor=…&topicLimit=25
GET /api/forum/topics/my-topic?replyCursor=…&replyLimit=25
```

Seek predicates match the indexes exactly — topics on
`(board_id, is_pinned DESC, last_activity_at DESC, id DESC)`, replies on
`(topic_id, created_at ASC, id ASC)` where `kind = 'reply'`. The opening post is
returned separately and never consumes reply-page capacity.

Topic lists are a live feed: new activity can reorder rows mid-traversal, so the
frontend deduplicates ids across accumulated pages and a refresh restarts the
traversal.

### Typed transport client

The API exports its Hono `AppType`, and the frontend builds its client from it:

```ts
// apps/forum/src/lib/api-client.ts
export const apiClient = hc<AppType>(API_ORIGIN, { init: { credentials: "include" } });
```

Every frontend request and response type is **inferred** from that type — none
are hand-maintained. `apps/forum/src/lib/api-client.contract.ts` is a
compile-only test that fails `pnpm typecheck` when the routes and the client
drift apart.

## Getting started

Requirements: Node 22, [pnpm](https://pnpm.io), [Bun](https://bun.sh), Docker.

```bash
pnpm install
```

Start the local development database and apply migrations:

```bash
docker compose -f docker-compose.dev.yml up -d --wait
cp .env.dev.example .env.dev   # then set a real AUTH_SECRET
pnpm db:migrate:dev
pnpm db:seed:dev
```

Run the app against that database — each command reads `.env.dev` through the
safety guard, in its own terminal:

```bash
pnpm --filter @forum/api dev:dev
```

```bash
pnpm --filter @forum/forum-app dev:dev
```

The forum is then at <http://localhost:3001> and the API at
<http://localhost:4000>.

The seed creates boards only. Sign up through the UI and create topics from
there — there is no content seed by default.

## Environment

Four environment files, each with one job:

| File            | Target                        | Used by                          |
|-----------------|-------------------------------|----------------------------------|
| `.env`          | Deployed database (QNAP)      | production runtime only          |
| `.env.dev`      | `forum_dev` @ 127.0.0.1:55433 | local development                |
| `.env.test`     | `forum_test` @ 127.0.0.1:55432| automated tests and CI           |
| `*.example`     | Committed templates           | copy, then fill in secrets       |

`AUTH_SECRET` must be at least 32 characters; the API refuses to start without
it. Generate one with `openssl rand -base64 32`.

**Never copy values from `.env` into `.env.dev` or `.env.test`.**

### Database safety

Every database command in this repo goes through a fail-closed guard
(`packages/db/src/safe-target.ts`) that rejects any target unless the host is
`localhost`/`127.0.0.1` **and** the database name ends in `_dev` or `_test`, per
command. **There is no environment-variable override.** Tests connect through
the same guard, so a misconfigured `.env.test` cannot reach a real database.

```bash
pnpm db:generate:dev    # generate migration SQL from the schema
pnpm db:migrate:dev     # apply to forum_dev
pnpm db:migrate:test    # apply to forum_test
pnpm db:seed:dev        # boards-only development seed
```

There is deliberately **no unguarded `db:migrate`, `db:push`, or `db:studio`
script**. Applying migrations to the deployed database is a manual, explicit act
— see *Deployment* below.

### Resetting a local database

Migration `0000` alters tables that predate this migration history, so an empty
database needs the pre-history schema first. The wrappers handle this: when a
safety-checked `_dev`/`_test` database is completely empty, they apply
`packages/db/sql/legacy-bootstrap.sql` before the migration history.

To start over:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --wait
pnpm db:migrate:dev && pnpm db:seed:dev
```

## Testing

```bash
docker compose -f docker-compose.test.yml up -d --wait
pnpm db:migrate:test

pnpm test              # unit tests (pure logic, no database)
pnpm test:integration  # module + HTTP tests against forum_test
pnpm test:e2e          # Playwright browser flows
```

Integration tests run **serially** because they share `forum_test` and truncate
between cases; Playwright uses a single worker and boots its own servers on
ports 4100/3101 via the fail-closed `dev:test` wrappers.

Two habits worth keeping:

- Integration tests assert **query counts**, not just results, so a recursive
  read cannot silently regress into N+1.
- The destructive migration has its own test that snapshots auth and profile
  rows, applies the migration, and compares **whole rows** — see
  `packages/db/tests/integration/contract-migration.test.ts`.

## CI

`.github/workflows/ci.yml` runs on every pull request using **only `_test`
configuration**: a workflow-local PostgreSQL service and `.env.test` copied from
the committed example. No deployment credentials exist in CI. It runs migration
safety, unit, integration and browser tests, type checks, read-only Biome, and
the build.

## Deployment

`scripts/deploy.sh` builds a linux/amd64 image, ships it to the NAS over SSH,
and restarts the container with `--env-file`.

**Migrations against the deployed database are manual and deliberate.** This
repo has no script that can reach it, by design. Note that the migration history
includes `0007`, a destructive contract/reset migration: it deletes all forum
content — topics, posts, votes, reactions, boards — while preserving every
`users`, `sessions`, and `accounts` row. Legacy forum rows cannot supply the
columns the current schema requires, so the forum is reset rather than
converted. Applying this history to a populated deployment is a decision to
discard its forum content.

## Troubleshooting: database unavailable

If the API cannot reach PostgreSQL it answers `503` with
`code: "DATABASE_UNAVAILABLE"` and the configured target. Check it directly:

```bash
curl http://localhost:4000/health/db
```

For the deployed database, the usual cause is a stopped container or a
container/host port mix-up: PostgreSQL listens on `5432` inside the container
but is published on a different host port, and `.env` must use the **host**
port.

```bash
docker ps --filter name=forum-db --format 'table {{.Status}}\t{{.Ports}}'
docker start forum-db && docker logs --tail 30 forum-db
docker exec forum-db pg_isready
```

Wait for `database system is ready to accept connections`, confirm the port is
reachable with `nc -vz -w 3 <host> <port>`, then restart the dev server — a
running process does not reload database environment variables.

## Documentation

| Document                  | Contents                                        |
|---------------------------|-------------------------------------------------|
| `docs/REFACTOR_PLAN.md`   | The architecture refactor, phase by phase       |
| `docs/TESTING.md`         | Test database setup and safety rules            |
| `docs/ROADMAP.md`         | Planned features                                |
