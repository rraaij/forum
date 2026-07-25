# Forum Architecture Refactor Plan

Status: ready for implementation
Sources: architecture review completed 2026-06-24 and `docs/ROADMAP.md`
Scope: development only; production and QNAP rollout are not part of this plan

## Progress Tracker

- [x] Phase 0: Baseline and safety harness
- [x] Phase 1: Pure contracts and domain errors
- [ ] Phase 2: Additive Forum schema expansion
- [ ] Phase 3: Topic discussion module
- [ ] Phase 4: Forum read model and canonical routes
- [ ] Phase 5: Board management module and Admin UI
- [ ] Phase 6: Profile edit module and UI
- [ ] Phase 7: Profile activity module and UI
- [ ] Phase 8: Destructive contract/reset migration
- [ ] Phase 9: Cleanup and final verification

Check a phase only after every phase item, required test, review boundary, and gate
is checked. Check an individual item only after its implementation and relevant
verification are complete. If implementation changes a fixed decision, update this
document and obtain agreement before continuing.

## 1. Objective

Replace the current route-centered architecture with deep Hono domain modules that
concentrate Forum hierarchy, Topic/Post lifecycle, Admin hierarchy management,
Profile editing, and Profile activity rules behind small interfaces.

This is a full redesign, not a behavior-preserving extraction. HTTP contracts,
frontend URLs, and the Forum persistence model may change. Existing Forum content
may be reset. Authentication users, sessions, accounts, and Profile fields must not
be deleted by the reset.

The work is complete when every item below is checked:

- [ ] Topic creation, reply creation, Post editing, Post deletion, and Topic counters
  are transactional and tested through one Topic discussion interface.
- [ ] Categories and Subcategories are represented by one arbitrary-depth `boards`
  hierarchy.
- [ ] Forum pages each load one page-oriented read model instead of rebuilding the
  hierarchy through multiple HTTP calls.
- [ ] Board Topic lists and Topic replies use deterministic keyset pagination with
  documented live-feed consistency.
- [ ] Admin Board commands own hierarchy rules, normalization, conflict handling, and
  recursive purge behavior.
- [ ] Board management is hosted at `/admin/boards` with client and server guards.
- [ ] Profile editing and Profile activity are separate backend and frontend modules.
- [ ] Existing route modules and UI pages are adapters; they do not implement domain
  rules or database queries.
- [ ] Every transport input is runtime-validated before module invocation.
- [ ] Frontend HTTP types are derived from Hono instead of maintained manually.
- [ ] Unit, PostgreSQL integration, HTTP contract, and critical browser tests run from
  documented workspace scripts.
- [ ] Pull requests run deterministic type, format, test, and build gates in CI.

## 2. Decisions Fixed by This Plan

| Decision                    | Choice                                                                                          |
|-----------------------------|-------------------------------------------------------------------------------------------------|
| Scope                       | Full redesign                                                                                   |
| Primary seam                | Domain modules in `packages/api`; Hono routes and Solid loaders are adapters                    |
| Test database               | Dedicated local PostgreSQL Docker service; never the QNAP database                              |
| Forum hierarchy             | One arbitrary-depth `boards` adjacency list                                                     |
| Root terminology            | A root Board is presented as a Category; a non-root Board is presented as a Subcategory         |
| Board slug uniqueness       | Case-insensitive among siblings; root slugs case-insensitively unique among roots               |
| Topic parent                | One required `boardId`                                                                          |
| Topic slug uniqueness       | Case-insensitively global                                                                       |
| Opening Post                | Explicit `posts.kind = 'opening'`                                                               |
| Topic counter               | `replyCount` counts non-deleted reply Posts only                                                |
| Quotes                      | Immutable structured snapshot; later source edits/deletion do not change the quote              |
| Forum reads                 | Page-oriented queries                                                                           |
| Forum collection pagination | Board Topic lists and Topic replies use keyset pagination; Profile activity remains unpaginated |
| Browser URLs                | Explicit resource paths; no reserved `topics` Subcategory slug                                  |
| Nested Board URLs           | Identify a non-root Board by UUID, not by its full ancestry path                                |
| Topic views                 | Explicit command, deduplicated once per browser session per Topic                               |
| Board deletion              | Confirmed recursive purge                                                                       |
| Profile activity            | Return all activity; pagination is intentionally not added                                      |
| Profile images              | Keep validated data URLs in PostgreSQL                                                          |
| Board management host       | Dedicated `/admin/boards` route; broader Admin product areas remain separate                    |
| Transport validation        | Validate path, query, and JSON inputs at runtime before module invocation                       |
| HTTP type derivation        | Export Hono `AppType` and derive frontend transport types with `hc<AppType>`                    |
| Existing Forum content      | Reset allowed; authentication and Profile data preserved                                        |
| Deployment                  | Local development and verification only                                                         |

Changing one of these decisions requires updating this document before implementation.

## Roadmap Reconciliation

The following `docs/ROADMAP.md` recommendations are included in this refactor:

- [ ] Add runtime validation to currently exposed writes first, then every new
  adapter.
- [ ] Enforce locked-Topic reply rejection transactionally on the server.
- [ ] Add keyset pagination and matching indexes for Board Topics and Topic replies.
- [ ] Replace hand-maintained frontend transport types with Hono RPC derivation.
- [ ] Add Vitest, PostgreSQL integration tests, Playwright smoke flows, and CI.
- [ ] Debounce Topic views per browser session through an explicit command.
- [ ] Update reply counters and activity timestamps transactionally.
- [ ] Eliminate Category/Board loader N+1 requests with page-oriented reads.
- [x] Validate required environment variables at API startup and remove the
  hardcoded Better Auth secret fallback.
- [ ] Rewrite the relevant README setup, architecture, testing, and reset sections
  after implementation.

Resolved differences from the roadmap:

- [x] Keep immutable quote snapshots rather than live Post references. This was
  explicitly reconfirmed after reviewing the roadmap.
- [x] Keep Profile images as validated PostgreSQL data URLs during this refactor.
  NAS/object storage remains a separately prioritized follow-up.
- [x] Host Board management at `/admin/boards`, but do not add dashboard, user,
  sanctions, or moderation pages in this refactor.
- [x] Reset existing Forum content instead of retaining a legacy quote parser.

Roadmap work intentionally deferred until the refactor provides stable seams:

- Roles, sanctions, moderator capabilities, and the broader Admin panel.
- Search, notifications, unread tracking, Markdown, rate limiting, email flows,
  RSS, PWA/native applications, and Profile image storage migration.
- AI-powered users and the `apps/agents` application.
- Production/QNAP deployment changes.

Urgent operational work tracked independently from implementation:

- [ ] Rotate the QNAP PostgreSQL password identified as exposed in repository
  history and update only secret stores/untracked environment files.

## 3. Current Problems to Remove

### 3.1 Topic discussion lifecycle

- `packages/api/src/routes/topics.ts` inserts a Topic and opening Post separately.
- `packages/api/src/routes/posts.ts` inserts a reply and updates Topic counters
  separately.
- A lock check can race with reply insertion.
- `postCount` includes the opening Post and does not account for soft deletion.
- Opening-Post identity is inferred from timestamp order in
  `apps/forum/src/components/TopicDetailPage.tsx`.
- Quote data is encoded into Post content by UI-local functions.
- `GET /api/topics/:id` mutates `viewCount`, so loader invalidation records views.

### 3.2 Forum tree reads

- Category, Subcategory, and Topic resolution is repeated across route loaders.
- Category and Subcategory pages issue one Topic request per Board.
- The frontend reconstructs the hierarchy from flat arrays.
- The string `topics` is a reserved fake Subcategory segment known by several
  callers.
- Profile activity constructs Topic URLs independently.

### 3.3 Admin hierarchy management

- Category and Subcategory rules are mirrored in a 425-line route module.
- `CategoryManagerDialog.tsx` owns hierarchy depth, normalization, mutation,
  refetch, and presentation concerns in 778 lines.
- The existing two-level depth restriction conflicts with the new arbitrary-depth
  requirement.
- Recursive cascades have no impact preview or race-safe confirmation contract.

### 3.4 Profile modules

- Profile edit, image policy, password UI, activity query, activity links, and
  tooltip behavior share one route module.
- Profile activity is coupled to the old Category/Subcategory schema and URL
  convention.
- Server image validation is trapped in the route adapter and client validation is
  duplicated.

## 4. Target Persistence Model

Update `packages/db/src/schema/forum.ts`. Keep authentication/Profile columns in
`packages/db/src/schema/auth.ts` unchanged unless a compile-only relation update is
required.

### 4.1 `boards`

| Column         | Type          | Rule                                       |
|----------------|---------------|--------------------------------------------|
| `id`           | UUID          | Primary key, generated                     |
| `parentId`     | UUID nullable | Self-reference; `null` means root Category |
| `name`         | text          | Trimmed, non-empty                         |
| `slug`         | text          | Normalized lowercase slug, non-empty       |
| `abbreviation` | varchar(5)    | Trimmed uppercase display code             |
| `description`  | text nullable | Trimmed; empty becomes `null`              |
| `icon`         | text nullable | Root and child Boards may use it           |
| `sortOrder`    | integer       | Non-negative; default `0`                  |
| `createdAt`    | timestamp     | Default current time                       |
| `updatedAt`    | timestamp     | Default current time; changed by commands  |

Required indexes and constraints:

- A partial unique index on `lower(slug)` where `parent_id IS NULL`.
- A partial unique index on `(parent_id, lower(slug))` where
  `parent_id IS NOT NULL`.
- Apply equivalent sibling-scoped uniqueness to normalized `name` and
  `abbreviation` so Admin errors remain deterministic.
- A check that `id <> parent_id`.
- A check that `sort_order >= 0`.
- An index on `(parent_id, sort_order, name)` for child traversal.
- An authoritative cycle-prevention trigger using a recursive CTE. The module
  performs the same check for a useful typed error; the trigger protects direct
  SQL and races.

`parentId` uses `ON DELETE CASCADE` only because recursive deletion is an explicit
accepted command. The Admin command must calculate and confirm impact before it
issues the root delete.

### 4.2 `topics`

Replace `categoryId`, `subcategoryId`, `postCount`, and `lastPostAt` with:

| Column           | Type      | Rule                                               |
|------------------|-----------|----------------------------------------------------|
| `boardId`        | UUID      | Required FK to `boards.id`, cascade on Board purge |
| `slug`           | text      | Globally unique using `lower(slug)`                |
| `replyCount`     | integer   | Non-negative count of active `reply` Posts         |
| `lastActivityAt` | timestamp | Opening-Post time or newest active reply time      |

Keep Topic author, title, pinned/locked flags, view count, and timestamps. Add
indexes on `boardId`, `authorId`, and
`(boardId, isPinned DESC, lastActivityAt DESC, id DESC)` for keyset traversal.
Add `CHECK (reply_count >= 0)`.

The Topic module must generate a non-empty slug. A global collision returns a
typed `TOPIC_SLUG_CONFLICT`; it must not silently append a suffix in this refactor.

### 4.3 `posts`

Add:

| Column          | Type               | Rule                                      |
|-----------------|--------------------|-------------------------------------------|
| `kind`          | PostgreSQL enum    | `opening` or `reply`; required            |
| `quoteSnapshot` | JSONB nullable     | Immutable quote payload for a reply       |
| `deletedAt`     | timestamp nullable | Set with `isDeleted`; `null` while active |

The quote snapshot has this versioned shape:

```ts
interface QuoteSnapshotV1 {
  version: 1;
  sourcePostId: string;
  authorName: string;
  content: string;
  createdAt: string;
}
```

Required constraints:

- A partial unique index permits at most one `opening` Post per Topic. The
  `createTopic` transaction guarantees that a newly committed Topic has exactly
  one; PostgreSQL integration tests verify the cross-table invariant.
- `opening` Posts cannot have a quote snapshot.
- A quote snapshot is accepted only for `reply` Posts.
- A check requires `isDeleted = false` with `deletedAt IS NULL`, or
  `isDeleted = true` with `deletedAt IS NOT NULL`.
- New Topics are created only through the transaction that inserts their opening
  Post; the unique index prevents duplicates, while module integration tests prove
  existence.
- Add a partial index on `(topicId, createdAt ASC, id ASC)` where
  `kind = 'reply'` for reply keyset traversal. The opening Post is returned
  separately and never consumes reply-page capacity.

Opening Posts cannot be deleted. Deleted replies cannot be edited or quoted.
Soft-deleting a reply decrements `replyCount` and recomputes `lastActivityAt` in
the same transaction. Repeating deletion is idempotent and does not decrement
again.

### 4.4 Topic view deduplication

Add `topic_views`:

| Column             | Type      | Rule                              |
|--------------------|-----------|-----------------------------------|
| `topicId`          | UUID      | FK to Topic, cascade on delete    |
| `browserSessionId` | UUID      | Opaque browser-session identifier |
| `createdAt`        | timestamp | Default current time              |

Use `(topicId, browserSessionId)` as the primary or unique key. The browser stores
one UUID in `sessionStorage` and sends it to the explicit view command. The command
inserts with conflict-ignore and increments `topics.viewCount` only when insertion
succeeds, in one transaction.

Records older than 30 days may be deleted by a documented maintenance query; the
accumulated `viewCount` remains. Automating cleanup is outside this refactor.

### 4.5 Expand and reset migrations

Use a local expand/contract sequence so every review point can compile and run even
though production compatibility is not required.

The additive expansion migration must:

- [ ] Create `boards`, `topic_views`, the Post-kind enum, indexes, and cycle trigger.
- [ ] Add the new Topic/Post columns as nullable while legacy routes still compile.
- [ ] Leave Categories, Subcategories, and legacy Topic columns in place temporarily.
- [ ] Make no seed-data changes; migrations must produce an empty Forum when
  starting from an empty database.

After every caller has moved, generate one clearly named destructive contract/reset
migration. It must:

- [ ] Delete dependent Forum content in this order: votes, reactions, Topic views,
  Posts, Topics, Subcategories, Categories, and temporary Board seed rows.
- [ ] Drop obsolete Forum tables, Topic parent/counter columns, cross-table
  uniqueness triggers, and the persisted
  `enforce_forum_identifier_cross_table_uniqueness()` function.
- [ ] Make the redesigned Topic/Post columns required and add all final checks,
  indexes, and constraints.
- [ ] Preserve `users`, `sessions`, `accounts`, and every Profile column/value in
  `users`.

Migration safety belongs in an executable wrapper, not in SQL. Add explicit
`db:generate:dev`, `db:migrate:test`, `db:migrate:dev`, and `db:seed:dev` scripts
that receive `.env.test` or `.env.dev`, parse the effective target, and hard-reject
it unless the host is `localhost` or `127.0.0.1` and the database name ends in
`_test` or `_dev`. There is no environment-variable override for this rejection.
The existing root-`.env` migration/seed scripts must not be used by this refactor
workflow.

Test fixtures create their own users and Forum content after migrations. The
development seed creates Boards only. A separate optional content seed may accept
`DEV_SEED_USER_ID`, but it must first verify that the user exists in the development
database.

Back up the local development database before running the contract/reset migration.
There is no migration of old quote text or old Forum content by design.

## 5. Target Backend Modules

Modules receive dependencies; they must not call the global `getDb()` internally.
`packages/api/src/db.ts` remains the composition root used by Hono adapters.

### 5.1 Topic discussion

Location:

```text
packages/api/src/modules/topic-discussion/
  commands.ts
  repository.ts
  validation.ts
  errors.ts
  types.ts
  index.ts
```

External interface:

```ts
interface TopicDiscussion {
  createTopic(input: {
    actorId: string;
    boardId: string;
    title: string;
    content: string;
  }): Promise<{ topicId: string; slug: string }>;

  replyToTopic(input: {
    actorId: string;
    topicId: string;
    content: string;
    quotedPostId?: string;
  }): Promise<{ postId: string }>;

  editPost(input: {
    actor: { id: string; role: string };
    postId: string;
    content: string;
  }): Promise<void>;

  deleteReply(input: {
    actor: { id: string; role: string };
    postId: string;
  }): Promise<{ alreadyDeleted: boolean }>;

  recordTopicView(input: {
    topicId: string;
    browserSessionId: string;
  }): Promise<{ counted: boolean }>;
}
```

Implementation rules:

- Trim Topic titles to `3..200` characters and Post content to `1..50_000`
  characters at both transport and module seams.
- Lock the Topic row before checking `isLocked` and inserting a reply.
- Use one timestamp per command for all related records.
- Create Topic plus opening Post in one transaction.
- Create reply plus counter/activity update in one transaction.
- Read the quoted Post inside the reply transaction and persist
  `QuoteSnapshotV1`; never accept snapshot fields from the browser.
- Keep authorization in the module, but obtain the authenticated actor in the Hono
  adapter. Hono middleware remains the security boundary that establishes actor
  identity.
- Return typed domain errors. Route adapters alone map them to HTTP statuses.
- Do not expose Drizzle rows or transaction objects in the external interface.

### 5.2 Forum read model

Location:

```text
packages/api/src/modules/forum-read/
  queries.ts
  repository.ts
  mappers.ts
  errors.ts
  types.ts
  index.ts
```

External interface:

```ts
interface ForumReadModel {
  getForumIndex(): Promise<ForumIndexReadModel>;
  getCategoryPage(input: {
    categorySlug: string;
    topics: PageRequest;
  }): Promise<CategoryPageReadModel>;
  getBoardPage(input: {
    categorySlug: string;
    boardId: string;
    topics: PageRequest;
  }): Promise<BoardPageReadModel>;
  getTopicPage(input: {
    topicSlug: string;
    replies: PageRequest;
  }): Promise<TopicPageReadModel>;
}

interface PageRequest {
  cursor?: string;
  limit?: number;
}

interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
```

Read-model requirements:

- `getForumIndex` returns all root Boards with recursively nested children,
  direct Topic counts, recursive Topic totals, and latest activity metadata.
- `getCategoryPage` returns the root Category, its immediate child Boards,
  breadcrumbs, a page of direct Topics, and aggregate metadata.
- `getBoardPage` verifies that `boardId` descends from `categorySlug`, then returns
  its children, full breadcrumb ancestry, a page of direct Topics, and aggregate
  metadata.
- `getTopicPage` resolves the globally unique slug and returns canonical route
  params, Board breadcrumbs, Topic metadata, explicit opening Post, ordered active
  and deleted reply page, quote snapshots, and author presentation fields.
- Topic ordering is pinned first, then `lastActivityAt` descending, then `id` as a
  stable tie-breaker.
- Post ordering is `createdAt`, then `id`; consumers never infer kind from order.
- Topic cursors encode version `1` plus `(isPinned, lastActivityAt, id)`; reply
  cursors encode version `1` plus `(createdAt, id)`. Encode as opaque base64url JSON
  and runtime-validate the decoded version and tuple before querying.
- Default page size is `25`; the hard maximum is `100`.
- Use seek predicates that exactly match the declared order and indexes. Reply
  pagination is stable because its ordering tuple is immutable. Topic pagination is
  a live feed: `lastActivityAt` can change while paging, so it does not promise a
  frozen snapshot or recovery of an unvisited Topic that moves ahead of the cursor.
  The frontend deduplicates accumulated Topics by ID and a refresh starts a new
  traversal from the current first page.
- Unsupported, malformed, or tampered cursors return a typed validation error.
- Queries do not mutate view counts or any other state.
- Avoid one query per Board. Use recursive CTEs and grouped aggregates, or a fixed
  number of bulk queries assembled inside the module.

### 5.3 Board management

Location:

```text
packages/api/src/modules/board-management/
  commands.ts
  repository.ts
  hierarchy-policy.ts
  normalization.ts
  errors.ts
  types.ts
  index.ts
```

External interface:

```ts
interface BoardManagement {
  createBoard(input: CreateBoardInput): Promise<{ boardId: string }>;
  updateBoard(input: UpdateBoardInput): Promise<void>;
  moveBoard(input: {
    boardId: string;
    newParentId: string | null;
    sortOrder: number;
  }): Promise<void>;
  previewRecursivePurge(boardId: string): Promise<BoardPurgeImpact>;
  purgeBoardTree(input: {
    boardId: string;
    confirmationName: string;
    expectedImpact: BoardPurgeImpactCounts;
  }): Promise<BoardPurgeImpactCounts>;
}
```

Implementation rules:

- Normalize name, slug, abbreviation, description, icon, and sort order once.
- Permit arbitrary depth but reject self-parenting and cycles.
- Sibling uniqueness errors identify the conflicting field.
- All Board hierarchy mutations take one transaction-scoped advisory hierarchy
  lock before row locks. This gives moves a deterministic lock order and prevents
  concurrent moves from invalidating cycle checks.
- The purge preview recursively counts Boards, Topics, Posts, reactions, votes, and
  Topic-view records.
- Purge requires an exact case-sensitive Board-name confirmation.
- Purge takes an exclusive transaction-scoped Forum-content advisory lock before
  locking and recounting the subtree. Board, Topic, Post, reaction, vote, and view
  write commands take the shared form of the same lock. This prevents any affected
  content write while purge validates and deletes.
- Every transaction requiring both advisory locks acquires the hierarchy lock
  first and the Forum-content lock second. No implementation may reverse this
  order.
- Purge returns `PURGE_IMPACT_CHANGED` if the submitted counts are stale. Only then
  may the transaction delete the root.
- `adminGuard` remains in the Hono adapter and applies to every command route.

### 5.4 Profile edit

Location:

```text
packages/api/src/modules/profile-edit/
  commands.ts
  queries.ts
  image-policy.ts
  validation.ts
  mapper.ts
  errors.ts
  types.ts
  index.ts
```

Interface:

```ts
interface ProfileEdit {
  getProfile(userId: string): Promise<EditableProfile>;
  updateProfile(input: UpdateProfileInput): Promise<EditableProfile>;
  updateAvatar(input: {
    userId: string;
    image: string | null;
  }): Promise<{ image: string | null }>;
}
```

Keep current HTTP(S), data-URL MIME type, decoded two-megabyte image limit,
twelve-photo gallery limit, text lengths, date validation, and immutable username
behavior unless a characterization test proves current behavior is accidental.
Document `updateProfile` as replacement semantics rather than pretending it is a
partial patch.

Password changes stay in Better Auth and are not part of this module.

### 5.5 Profile activity

Location:

```text
packages/api/src/modules/profile-activity/
  queries.ts
  repository.ts
  types.ts
  index.ts
```

Interface:

```ts
interface ProfileActivity {
  getAllForUser(userId: string): Promise<ProfileActivityItem[]>;
}
```

Each item returns explicit Post kind, deletion state, Board breadcrumbs, and
canonical frontend route params. It does not infer Topic starts through window
position and does not construct legacy URLs. Returning all activity is an accepted
decision; add an integration test with a large fixture to make the cost visible.

### 5.6 Interaction writes supporting purge safety

Location:

```text
packages/api/src/modules/interaction-write/
  commands.ts
  repository.ts
  types.ts
  index.ts
```

Expose `toggleReaction` and `applyVote` with the current route behavior. This is not
a reaction/vote redesign. Its purpose is to move direct database writes out of
route adapters and ensure each mutation acquires the shared Forum-content advisory
lock in the same transaction as its insert/update/delete. Existing reaction and
vote HTTP contracts stay unchanged.

## 6. HTTP Contracts

Replace low-level read endpoints after the new adapters are ready:

| Method   | Endpoint                                                                     | Module call                              |
|----------|------------------------------------------------------------------------------|------------------------------------------|
| `GET`    | `/api/forum`                                                                 | `getForumIndex()`                        |
| `GET`    | `/api/forum/categories/:categorySlug?topicCursor&topicLimit`                 | `getCategoryPage(...)`                   |
| `GET`    | `/api/forum/categories/:categorySlug/boards/:boardId?topicCursor&topicLimit` | `getBoardPage(...)`                      |
| `GET`    | `/api/forum/topics/:topicSlug?replyCursor&replyLimit`                        | `getTopicPage(...)`                      |
| `POST`   | `/api/topics`                                                                | `createTopic(...)`                       |
| `POST`   | `/api/topics/:topicId/replies`                                               | `replyToTopic(...)`                      |
| `PATCH`  | `/api/posts/:postId`                                                         | `editPost(...)`                          |
| `DELETE` | `/api/posts/:postId`                                                         | `deleteReply(...)`                       |
| `POST`   | `/api/topics/:topicId/views`                                                 | `recordTopicView(...)`                   |
| `POST`   | `/api/admin/boards`                                                          | `createBoard(...)`                       |
| `PATCH`  | `/api/admin/boards/:boardId`                                                 | `updateBoard(...)`                       |
| `POST`   | `/api/admin/boards/:boardId/move`                                            | `moveBoard(...)`                         |
| `GET`    | `/api/admin/boards/:boardId/purge-impact`                                    | `previewRecursivePurge(...)`             |
| `POST`   | `/api/admin/boards/:boardId/purge`                                           | `purgeBoardTree(...)`                    |
| `GET`    | `/api/profile`                                                               | `getProfile(actorId)`                    |
| `PUT`    | `/api/profile`                                                               | `updateProfile(...)` replacement command |
| `PUT`    | `/api/profile/avatar`                                                        | `updateAvatar(...)`                      |
| `GET`    | `/api/profile/activity`                                                      | `getAllForUser(actorId)`                 |

Use a consistent error envelope:

```ts
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}
```

Minimum status mapping:

| Domain error                                        | HTTP status |
|-----------------------------------------------------|-------------|
| Validation error                                    | `400`       |
| Unauthenticated                                     | `401`       |
| Forbidden or locked Topic                           | `403`       |
| Missing Board, Topic, or Post                       | `404`       |
| Slug/identifier conflict, cycle, stale purge impact | `409`       |

Admin routes intentionally preserve the current `adminGuard` contract: both a
missing actor and a non-admin actor receive `403`. Other authenticated routes use
`401` when no actor exists.

Update `apps/forum/src/lib/api.ts` in the first adapter migration so it understands
the structured envelope and throws a typed client error containing HTTP status,
domain code, message, and optional field. During migration it may also parse the
legacy string `error`; remove that temporary parser when old endpoints are deleted.

### 6.1 Runtime transport validation

Use Zod and `@hono/zod-validator` at every Hono adapter. Validate path parameters,
query strings, and JSON before invoking a module. Validation includes UUIDs,
normalized page limits, versioned cursors, enums, string bounds, and request-body
size limits. Validation failures use the standard error envelope and include
`field` where possible.

Minimum transport bounds:

| Input                                    | Bound                                                                     |
|------------------------------------------|---------------------------------------------------------------------------|
| Topic title                              | Trimmed `3..200` characters                                               |
| Post content                             | Trimmed `1..50_000` characters                                            |
| Reaction emoji                           | `1..32` Unicode code points                                               |
| Page limit                               | Integer `1..100`, default `25`                                            |
| IDs                                      | Canonical UUID except Better Auth text actor IDs                          |
| Normal JSON writes                       | Body limit `64 KiB`                                                       |
| Profile replacement with image data URLs | Body limit `34 MiB`; field-level decoded image/gallery limits still apply |

Transport validation is not the domain security seam. Modules repeat all domain
invariants because non-HTTP callers and future adapters can invoke them directly.
Type assertions such as `c.req.json<Input>()` are never accepted as validation.

Apply bounded runtime schemas to legacy write endpoints in Phase 0 because they
remain mounted until the Phase 4 frontend cutover.

### 6.2 Hono RPC type derivation

Export `AppType = typeof app` from `packages/api` and create the frontend transport
client with `hc<AppType>`. Infer request and response transport types from that
client; do not duplicate them in `apps/forum/src/types/forum.ts`.

Keep domain command/read-model types inside `packages/api`. Hono RPC derives the
transport interface only and does not make domain modules isomorphic. Add a
compile-only contract test that fails when the exported Hono routes and frontend
client drift.

Remove `/api/categories`, parent-filtered `GET /api/topics`, and ID-based Topic
detail only after all frontend callers use the page-oriented endpoints. Since this
is a full redesign, do not add compatibility aliases.

## 7. Frontend Routes and Modules

### 7.1 Canonical routes

Use these TanStack Router paths:

```text
/
/categories/$categorySlug
/categories/$categorySlug/subcategories/$boardId
/categories/$categorySlug/topics/$topicSlug
/categories/$categorySlug/subcategories/$boardId/topics/$topicSlug
/admin/boards
/profile
```

Direct root-Board Topics use the first Topic path. Topics belonging to any nested
Board use the UUID-based Subcategory path. `getTopicPage` returns which path and
params are canonical, so links never reproduce hierarchy rules.

Guard `/admin/boards` in `beforeLoad` using session role for navigation UX and keep
`adminGuard` on every Board-management endpoint as the security seam.

Use typed `to` plus `params`; never interpolate route params into `to`. Route
loaders call the Hono API and may run on server or client. No loader imports the
database or a server-only module.

No redirects from old compact paths are required. Remove the old route files and
regenerate `apps/forum/src/routeTree.gen.ts` through the project route-generation
workflow (currently Vite build/dev) before type checking.

### 7.2 Frontend feature layout

```text
apps/forum/src/features/topic-discussion/
  api.ts
  CreateTopicPanel.tsx
  TopicDetailPage.tsx
  PostList.tsx
  ReplyComposer.tsx
  QuoteSnapshot.tsx
  topic-view-session.ts

apps/forum/src/features/board-management/
  api.ts
  use-board-manager.ts
  BoardManagerPage.tsx
  BoardTree.tsx
  BoardForm.tsx
  MoveBoardForm.tsx
  PurgeBoardDialog.tsx

apps/forum/src/features/profile-edit/
  api.ts
  image-file-policy.ts
  use-profile-editor.ts
  ProfileForm.tsx
  ProfileGallery.tsx
  ChangePasswordDialog.tsx

apps/forum/src/features/profile-activity/
  api.ts
  ProfileActivity.tsx
  ActivityTopicLink.tsx
```

Extraction rules:

- Keep Solid reactive state in controller primitives or route components; backend
  domain modules remain framework-independent.
- Keep browser file reading in `image-file-policy.ts`; the server repeats all
  security-relevant validation.
- Send mutations from the browser so Better Auth cookies are naturally included.
- Invalidate the narrowest active route after mutation. Do not force a page reload.
- `TopicDetailPage` renders `openingPost` and `replies` explicitly and never uses
  `posts[0]` or `postCount - 1`.
- Board and Topic loaders request the first page. Feature APIs request subsequent
  pages through a “Load more” interaction, append in cursor order, and deduplicate
  by ID. Page numbers are outside this refactor.
- Quote rendering consumes the immutable snapshot returned by the API; delete the
  custom text quote parser after the content reset.
- `topic-view-session.ts` creates one UUID in `sessionStorage` and calls the view
  command only after the Topic page successfully renders. SSR must not access
  `sessionStorage`.
- Profile activity renders canonical route params supplied by the backend read
  model.

## 8. Test Infrastructure

### 8.1 Workspace setup

Add Vitest for unit/integration tests and Playwright for critical browser flows.
Add root/Turbo scripts:

```json
{
  "test": "turbo run test",
  "test:integration": "turbo run test:integration",
  "test:e2e": "playwright test",
  "typecheck": "tsc -b && tsc --project apps/forum/tsconfig.json --noEmit"
}
```

Configure Playwright `webServer` entries to start and wait for both the API and
frontend. Add fail-closed `dev:test` and `dev:dev` API startup wrappers: test uses
`.env.test`, development uses `.env.dev`, and both apply the same loopback/database
suffix checks as migration wrappers before creating a database client. Add matching
frontend commands whose API URL is loopback-only. Playwright must use `dev:test`;
manual local verification must use `dev:dev`. E2E tests must not assume a manually
running dev server or source normal `.env`.

Add `.github/workflows/ci.yml` after these scripts are deterministic. Pull requests
run PostgreSQL as a service and execute install, migrations, unit/integration tests,
Playwright, type checks, read-only Biome, and builds. CI must use `_test` variables
and must not have access to QNAP credentials.

Add one runtime environment schema used before API/Auth/DB composition. Require and
validate `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `AUTH_SECRET`, `APP_URL`, and `API_URL`. Require an
`AUTH_SECRET` of at least 32 characters and remove the hardcoded development-secret
fallback. Tests and local development receive valid values through their dedicated
environment files.

Do not rely on the current root `tsc -b` alone; it does not reference the frontend.
Use `pnpm exec biome check .` for a read-only gate because `pnpm check` currently
runs Biome with `--write`.

### 8.2 Isolated PostgreSQL

Add `docker-compose.test.yml` with a health-checked PostgreSQL service on an unused
host port and database name `forum_test`. Add `docker-compose.dev.yml` with a
separate health-checked PostgreSQL service/database named `forum_dev`. Add
`.env.test.example` and `.env.dev.example` without secrets. The existing QNAP
target remains only in the normal `.env`.

The test bootstrap must abort unless all are true:

- Host is `localhost` or `127.0.0.1`.
- Database name ends in `_test`.
- The connection target differs from the normal `.env` target.

The committed migration history starts from a previously schema-pushed database:
`0000_romantic_blackheart.sql` alters `categories` rather than creating the initial
tables. Add an idempotent test-only legacy bootstrap SQL file that reconstructs the
exact pre-`0000` schema expected by the historical migrations. It may run only
against an empty, safety-checked `_test` database. Then run every committed
migration, including expansion and contract/reset migrations. A migration smoke
test must prove empty database -> legacy bootstrap -> complete history -> target
schema.

Run integration tests serially against one test database: one global bootstrap and
migration, then foreign-key-safe truncation between tests. Configure Vitest
integration projects with file parallelism disabled. Do not migrate or truncate
the same database from multiple workers. Tests create their own users; they never
use the QNAP admin account.

Configure Playwright with one worker while it shares `forum_test`. Reset deterministic
browser fixtures before each test so global Topic slugs and recursive purge cases
cannot collide. Increase workers only after provisioning an isolated database per
worker.

### 8.3 Required test matrix

Topic discussion integration tests:

- [ ] Topic plus opening Post commit together and roll back together.
- [ ] Exactly one opening Post exists.
- [ ] Empty title/content and missing Board are rejected.
- [ ] Global case-insensitive Topic slug conflict returns the typed conflict.
- [ ] Reply to locked Topic is rejected while holding the Topic lock.
- [ ] Reply insertion updates `replyCount` and `lastActivityAt` atomically.
- [ ] Quote snapshot is copied from the source Post and ignores forged client fields.
- [ ] Deleted source Posts cannot be quoted.
- [ ] Opening Posts cannot be deleted.
- [ ] Reply deletion decrements once and recomputes last activity.
- [ ] Deleted Posts cannot be edited.
- [ ] View command counts once per Topic/session pair.
- [ ] Missing, malformed, and oversized Topic/Post bodies fail transport validation
  before a transaction starts.

Forum read integration tests:

- [ ] Empty Forum, root-only, and at least five-level Board trees.
- [ ] Sibling ordering and sibling-scoped slug reuse under different parents.
- [ ] Recursive direct/aggregate Topic counts.
- [ ] Root Category lookup by case-insensitive slug.
- [ ] Board/category ancestry mismatch returns not found.
- [ ] Topic lookup by globally unique slug.
- [ ] Explicit opening Post and ordered replies.
- [ ] Stable ordering for equal activity timestamps.
- [ ] Query-count assertion prevents reintroducing one query per Board.
- [ ] Topic and reply pages have no duplicate IDs across adjacent pages.
- [ ] Equal timestamps use IDs as stable cursor tie-breakers.
- [ ] Cursor tampering, malformed tuples, unsupported versions, and over-limit requests
  return validation errors.
- [ ] Newer Topic activity does not duplicate accumulated IDs; refreshing restarts
  traversal and surfaces the current ordering.
- [ ] Deleting a latest reply can move a previously rendered Topic behind the active
  cursor; the frontend drops the repeated Topic ID instead of rendering a duplicate.
- [ ] Reply pagination does not duplicate or skip replies inserted after the current
  cursor.

Board management integration tests:

- [ ] Root and child creation normalization.
- [ ] Negative `sortOrder` fails at both module and database seams.
- [ ] Sibling name/slug/abbreviation conflicts.
- [ ] Same child slug under different parents succeeds.
- [ ] Move to self or descendant fails in both module and trigger.
- [ ] Concurrent conflicting moves/writes resolve deterministically.
- [ ] Purge preview counts the complete subtree and content.
- [ ] Purge rejects wrong name and stale expected impact.
- [ ] Confirmed purge removes the complete subtree atomically.
- [ ] Concurrent Board/Topic/Post/reaction/vote/view writes block behind purge and do
  not make the confirmed impact stale after its in-transaction recount.
- [ ] Concurrent move and purge commands complete without deadlock and always acquire
  hierarchy then Forum-content advisory locks.
- [ ] Non-admin HTTP requests cannot invoke any command.

Interaction-write regression tests:

- [ ] Reaction add/remove toggle semantics remain unchanged.
- [ ] Vote add/remove/switch semantics remain unchanged.
- [ ] Reaction and vote writes acquire the shared Forum-content advisory lock in the
  same transaction as their mutation.

Profile tests:

- [ ] Existing text, URL, date, image MIME/size, and gallery limits.
- [ ] Profile replacement semantics and independently updated avatar.
- [ ] Password command remains delegated to Better Auth.
- [ ] Activity returns opening/reply kind, deletion state, breadcrumbs, and canonical
  route params for root and deeply nested Boards.
- [ ] Activity deliberately returns all fixture rows.

Browser tests:

- [ ] Browse arbitrary-depth Boards and open root/nested Topics using canonical URLs.
- [ ] Create Topic, create reply, quote reply, edit reply, and soft-delete reply.
- [ ] Locked Topic rejects reply without corrupting UI state.
- [ ] Reloading/invalidation does not increase views; a new browser session does.
- [ ] Admin creates, moves, edits, previews, and recursively purges a Board subtree.
- [ ] Profile avatar/gallery edit and activity links work after route redesign.
- [ ] Topic and reply “Load more” controls preserve ordering and do not duplicate rows.
- [ ] A signed-in user can react, remove a reaction, upvote, switch to downvote, and
  remove a vote after the interaction module migration.

Transport/type tests:

- [ ] Every exposed path/query/body schema rejects malformed UUIDs and invalid bounds.
- [ ] Legacy write endpoints are runtime-validated until they are removed.
- [ ] The Hono `AppType` client compiles against all frontend feature API calls without
  hand-authored response types.

## 9. Implementation Phases

Phases are ordered by correctness and dependency. Each phase ends with a reviewable
gate. The additive schema exists beside the legacy schema until every caller moves;
the final contract/reset migration is not generated or applied earlier.

### Phase 0: Baseline and safety harness

Files:

- [x] Root `package.json`, `turbo.json`, and lockfile.
- [x] Package manifests for API and frontend tests.
- [x] `vitest.config.ts`, `playwright.config.ts`, `docker-compose.test.yml`,
  `docker-compose.dev.yml`, `.env.test.example`, and `.env.dev.example`.
- [x] Test database bootstrap/cleanup helpers.
- [x] `.github/workflows/ci.yml`.

Steps:

- [x] Add scripts and dependencies without changing runtime code.
- [x] Implement the fail-closed database target wrapper and explicit safe
  generation/migration scripts before running any database command.
- [x] Create ignored `.env.test` and `.env.dev` from their examples with
  loopback-only Docker targets. Document this one-time setup; no QNAP values may be
  copied.
- [x] Add fail-closed API/frontend `dev:test` and `dev:dev` scripts and configure
  Playwright `webServer` to use the test variants.
- [x] Add the pre-history bootstrap SQL and prove that an empty test database can
  run the full existing migration history.
- [x] Add a Hono `createApp().request()` smoke test.
- [x] Add characterization tests for current Profile validation and authorization
  status codes that this redesign intends to retain.
- [x] Add runtime Zod validation to every currently exposed legacy write endpoint,
  including Topic/Post, reaction/vote, Admin, and Profile mutations.
- [x] Add the startup environment schema and remove the Better Auth fallback secret.
- [x] Add one browser smoke test for Forum startup and authentication fixture setup.
- [x] Add CI after all Phase 0 commands are deterministic and locally green.

Gate:

- [x] Run the complete Phase 0 gate:

```bash
docker compose -f docker-compose.test.yml up -d --wait
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
```

- [x] Confirm no test or CI command can connect to `192.168.0.178` or the normal
  `.env` database. Stop immediately if this check fails.

### Phase 1: Pure contracts and domain errors

Steps:

- [x] Define the module input/result/error types described in sections 5 and 6.
- [x] Define `PageRequest`, `Page<T>`, versioned Topic/reply cursors, default limit
  `25`, and hard maximum `100`.
- [x] Extract and test normalization functions for Board and Topic fields.
- [x] Define `QuoteSnapshotV1` and pure validation.
- [x] Define canonical frontend route-param result types without importing TanStack
  Router into backend modules.
- [x] Define Zod transport schemas for all replacement path, query, and JSON inputs.
- [x] Add one route-level error mapper from typed domain errors to the standard HTTP
  envelope.
- [x] Export the Hono `AppType`, create the typed frontend `hc<AppType>` composition
  seam, and add a compile-only contract test.
- [x] Confirm no endpoint or database behavior changed in this phase.

Gate:

- [x] Run the complete Phase 1 gate:

```bash
pnpm test
pnpm typecheck
pnpm exec biome check .
```

### Phase 2: Additive Forum schema expansion

Steps:

- [ ] Add `boards` beside Categories/Subcategories.
- [ ] Add nullable `boardId`, `replyCount`, `lastActivityAt`, Post kind/snapshot/
  deletion fields, and `topic_views` beside legacy fields.
- [ ] Add null-compatible checks, cycle trigger, Board Topic keyset index, and reply
  keyset index; defer final `NOT NULL` and obsolete-column removal.
- [ ] Verify the safe generation/migration wrappers against rejected QNAP, wrong
  suffix, and accepted loopback targets. Do not route them through normal `.env`.
- [ ] Generate and manually inspect the additive migration.
- [ ] Update the development seed to create an arbitrary-depth Board hierarchy only.
- [ ] Apply through `db:migrate:test` and run DB tests without seed data.
- [ ] Start `docker-compose.dev.yml` with readiness waiting, apply through
  `db:migrate:dev`, then run a separately safety-checked `db:seed:dev` command for
  the Board-only development seed.
- [ ] Verify authentication/Profile rows are unchanged.

Gate:

- [ ] Run the complete Phase 2 gate:

```bash
pnpm --filter @forum/db db:generate:dev
git diff -- packages/db/migrations packages/db/src/schema
pnpm --filter @forum/db db:migrate:test
pnpm test:integration
docker compose -f docker-compose.dev.yml up -d --wait
pnpm --filter @forum/db db:migrate:dev
pnpm --filter @forum/db db:seed:dev
pnpm typecheck
pnpm exec biome check .
```

- [ ] Confirm the migration does not touch authentication tables or drop a legacy
  field/table. Stop if this or any cycle/index/constraint migration test fails.

### Phase 3: Topic discussion module

Steps:

- [ ] Implement the transaction-aware repository and inject it into commands.
- [ ] Implement `createTopic`, `replyToTopic`, `editPost`, `deleteReply`, and
  `recordTopicView` in that order.
- [ ] Enforce the locked-Topic rule while holding the Topic row lock.
- [ ] Add transaction rollback and concurrency integration tests before adapting
  HTTP.
- [ ] Implement runtime-validated replacement Topic/Post Hono adapters and test them
  directly without mounting them in `packages/api/src/routes/index.ts`.
- [ ] Leave legacy write handlers mounted so the existing frontend remains
  operational.
- [ ] Run all Topic discussion unit, PostgreSQL integration, and Hono contract tests.
- [ ] Inject a failure between each related write and confirm no partial data remains.
- [ ] Confirm frontend writes remain on legacy handlers until Phase 4 provides the
  new Topic read model and canonical route.

Gate:

- [ ] Run the complete Phase 3 gate:

```bash
pnpm test
pnpm test:integration
pnpm typecheck
pnpm exec biome check .
```

### Phase 4: Forum read model and canonical routes

Steps:

- [ ] Implement recursive Board reads and fixed-query aggregate loading.
- [ ] Implement versioned cursor encoding/decoding and seek predicates matching the
  Topic/reply indexes.
- [ ] Implement the four page-oriented queries with paginated direct Topics/replies.
- [ ] Add runtime-validated Hono read adapters and response contract tests.
- [ ] Add the canonical TanStack route files listed in section 7.1.
- [ ] Migrate the home loader, then Category loader, then Board loader, then Topic
  loader. After each migration, remove its old N+1 composition code.
- [ ] Add “Load more” behavior for Board Topics and Topic replies with ID
  deduplication.
- [ ] Atomically replace route registration and frontend callers in one commit: first
  update the UI calls, then swap `routes/index.ts` from legacy to replacement
  adapters before committing. Never register old and new handlers for the same
  method/path simultaneously.
- [ ] Run mounted HTTP/browser contract tests against the replacement routes, then
  delete the now-unmounted legacy handler files and their duplicated validation,
  slug, authorization, and counter logic.
- [ ] Replace quote text serialization with `quotedPostId` input and immutable
  snapshot output.
- [ ] Add browser-session view recording after successful client render.
- [ ] Replace every migrated Forum Topic link with typed canonical `to` and `params`,
  including `TopicsList`, Category pages, and Topic pages. Profile activity moves
  in Phase 7.
- [ ] Migrate feature API calls to `hc<AppType>` inferred transport types.
- [ ] Remove the `DIRECT_CATEGORY_SEGMENT` constant and old compact route files.
- [ ] Run Vite route generation/build and inspect `routeTree.gen.ts` changes.
- [ ] Remove obsolete read endpoints and manual response types only after no caller
  remains.
- [ ] Confirm each page makes one initial page-read request and additional requests
  only when “Load more” is invoked.
- [ ] Confirm deep Board navigation and the complete Topic browser flow pass.
- [ ] Confirm no source reference to the reserved-segment convention remains.

Gate:

- [ ] Run the complete Phase 4 gate:

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
```

### Phase 5: Board management module and Admin UI

Steps:

- [ ] Implement create/update/move commands and cycle-safe hierarchy policy.
- [ ] Implement purge preview and confirmed purge with impact recheck.
- [ ] Add the shared/exclusive Forum-content advisory-lock protocol to Board, Topic,
  Post, reaction, vote, and view write repositories.
- [ ] Implement the narrow `interaction-write` module and move reaction/vote writes
  behind it without changing their HTTP behavior.
- [ ] Replace `admin.ts` Category/Subcategory handlers with runtime-validated Board
  adapters.
- [ ] Preserve `adminGuard` on the complete `/api/admin/boards` route group.
- [ ] Add `/admin/boards` with a role-aware `beforeLoad` guard.
- [ ] Build the frontend management controller around explicit mutation states.
- [ ] Split page, tree, forms, move, and purge confirmation into focused UI modules.
- [ ] Replace full-page reload with route invalidation after successful mutation.
- [ ] Delete `CategoryManagerDialog.tsx` only after `/admin/boards` covers all
  commands.
- [ ] Confirm arbitrary-depth create/move works, cycles fail, and purge impact is
  race-checked.
- [ ] Confirm every non-admin HTTP contract test returns `403` and direct navigation
  to `/admin/boards` is blocked in the UI.

Gate:

- [ ] Run the complete Phase 5 gate:

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
```

### Phase 6: Profile edit module and UI

Steps:

- [ ] Move server Profile validation and mapping behind `ProfileEdit` without
  changing accepted values.
- [ ] Change the Hono route to a runtime-validated adapter and make replacement
  semantics explicit in its method/name and tests.
- [ ] Migrate Profile feature API calls to Hono-derived transport types.
- [ ] Extract browser image-file validation, controller state, form, gallery, and
  password dialog.
- [ ] Keep the header avatar preview integration, but expose it through the Profile
  controller rather than route-local mutation details.
- [ ] Replace broad global invalidation with Profile/session invalidation required
  by the changed avatar/name.
- [ ] Run Profile characterization and browser tests.
- [ ] Confirm the server remains authoritative for image security checks.

Gate:

- [ ] Run the complete Phase 6 gate:

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
```

### Phase 7: Profile activity module and UI

Steps:

- [ ] Replace the route-local SQL with `ProfileActivity.getAllForUser`.
- [ ] Query explicit Post kind and Board ancestry from the redesigned schema.
- [ ] Return canonical route params from one mapper shared conceptually with Forum
  reads; do not duplicate route policy in SQL or UI.
- [ ] Extract `ActivityTopicLink` and activity presentation from `profile.tsx`.
- [ ] Migrate Profile activity transport calls to Hono-derived types.
- [ ] Verify all rows are returned, including documented deleted-Post presentation.
- [ ] Delete old window-function opening-Post inference and legacy URL construction.
- [ ] Confirm root and deeply nested Topic links navigate correctly.
- [ ] Record query duration and row count in the large-fixture integration test.

Gate:

- [ ] Run the complete Phase 7 gate:

```bash
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
```

### Phase 8: Destructive contract/reset migration

Steps:

- [ ] Prove by source search and HTTP contract tests that no runtime caller uses
  Categories, Subcategories, or legacy Topic/Post fields.
- [ ] Generate the contract/reset migration described in section 4.5.
- [ ] Inspect every `DROP`, `DELETE`, and `ALTER`; verify no auth/Profile table or
  column appears.
- [ ] Apply from an empty test database through legacy bootstrap, all historical
  migrations, expansion, and contract/reset.
- [ ] Snapshot auth/Profile fixture rows before migration and compare every value
  afterward.
- [ ] Apply to `forum_dev` only through `db:migrate:dev` after a local backup.
- [ ] Run Board-only development seed, then create Topics through the application or
  the optional validated-user content seed.
- [ ] Confirm the target schema has no legacy Forum tables/columns/functions and all
  final constraints pass.
- [ ] Confirm authentication/Profile data is byte-for-byte unchanged.

Gate:

- [ ] Run the complete Phase 8 gate:

```bash
pnpm test
pnpm test:integration
pnpm typecheck
pnpm exec biome check .
pnpm build
```

### Phase 9: Cleanup and final verification

Steps:

- [ ] Search for obsolete schema names, endpoint paths, counters, quote codec
  markers, and reserved segments.
- [ ] Remove dead exports, hand-maintained transport response types, and superseded
  comments.
- [ ] Confirm route adapters contain only runtime validation, actor extraction,
  module invocation, and HTTP mapping.
- [ ] Confirm modules accept dependencies and expose no Drizzle/Hono/Solid types.
- [ ] Confirm all frontend transport calls derive from the exported Hono `AppType`.
- [ ] Confirm CI runs migration safety, unit/integration/E2E tests, type checks,
  read-only Biome, and builds using only `_test` configuration.
- [ ] Update README development, environment, database reset, pagination, testing,
  Hono client, canonical URL, and CI documentation.
- [ ] Render and manually inspect the Forum on desktop and mobile.

Required searches return no runtime matches:

```text
categories table import
subcategories table import
categoryId/subcategoryId on Topic
postCount
lastPostAt
DIRECT_CATEGORY_SEGMENT
parseQuotedReply
serializeQuotedReply
GET /api/topics?categoryId
GET /api/topics?subcategoryId
```

Final gate:

- [ ] Run the complete final gate:

```bash
pnpm install --frozen-lockfile
docker compose -f docker-compose.test.yml up -d --wait
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm typecheck
pnpm exec biome check .
pnpm build
docker build -f Dockerfile.api -t forum-api:refactor-test .
docker build -f Dockerfile -t forum-app:refactor-test .
```

## 10. Review Boundaries

Use separate reviews at these points:

- [ ] Test isolation, environment validation, and reset safety before any
  destructive migration exists.
- [ ] Target schema, pagination cursors/indexes, and constraints before generating
  the reset migration.
- [ ] Topic transaction behavior before frontend migration.
- [ ] Read-model response shapes and Hono-derived transport types before deleting
  old endpoints.
- [ ] Recursive purge UX and impact contract before enabling the delete command.
- [ ] Final architecture review using the deletion test: removing a new module
  should force its rules back into multiple adapters.

Do not combine unrelated visual redesign, moderation features, reaction/vote
redesign, Profile image storage migration, activity pagination, or production
deployment with these reviews.

## 11. Risks and Stop Conditions

| Risk                                                 | Mitigation / stop condition                                                         |
|------------------------------------------------------|-------------------------------------------------------------------------------------|
| Tests target QNAP data                               | Fail closed on host/database checks; stop immediately                               |
| Destructive migration touches auth/Profile data      | Abort and restore local backup                                                      |
| Arbitrary-depth cycle                                | Module check plus database trigger; block release on either failure                 |
| Counter drift under concurrency                      | Row lock and transaction tests; no manual repair fallback                           |
| Recursive reads become N+1                           | Fixed-query/query-count integration assertion                                       |
| Mutable Topic ordering changes during pagination     | Document live-feed semantics, deduplicate IDs, refresh to restart traversal         |
| Invalid or oversized transport input reaches modules | Body limits and Zod validation on every adapter                                     |
| Frontend/API transport types drift                   | Exported Hono `AppType` plus compile-only client contract test                      |
| Global Topic slug collision                          | Return explicit `409`; require a different title/slug                               |
| Purge impact changes after confirmation              | Exclusive advisory lock, recount, and return `409` without deleting                 |
| SSR accesses `sessionStorage`                        | Client-only view command after successful render                                    |
| Profile activity becomes slow                        | Keep all rows per decision, record large-fixture timing, file pagination separately |
| Contract migration runs before all callers move      | Block Phase 8 until source searches and contract tests prove no legacy use          |

## 12. Explicit Non-Goals

- Production/QNAP migration or deployment.
- Compatibility redirects for old Forum URLs.
- Preservation or transformation of existing Forum content.
- Reaction and vote redesign beyond schema/FK updates required by the reset.
- Roles, sanctions, and moderator capability expansion.
- Full Admin dashboard, user management, sanctions, and moderation pages.
- Profile image object/file storage.
- Profile activity pagination.
- Search, notifications, unread tracking, direct messages, Markdown, rate limiting,
  email flows, RSS, PWA/native applications, or other roadmap features.
- AI-powered users and the `apps/agents` application.
- Production environment/deployment hardening beyond separately tracked urgent
  credential rotation.
- A shared isomorphic domain package; server rules remain in `packages/api`.
