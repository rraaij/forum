# Deferred Work Backlog

This backlog expands the deliberately deferred items in
[`README.md`](./README.md). The forum redesign is complete; none of the work
below should be treated as a missing forum implementation detail.

Each top-level section is independently selectable. Complete its decision and
contract steps before building UI. Do not infer product state from timestamps,
existing activity, or reference artwork alone.

## Recommended Order

- [ ] Choose one track to start. Password reset is the smallest isolated
  product increment; personalised unread reactions and sibling apps need new
  domain contracts.
- [ ] Create an implementation issue for the selected track and link it from
  this document.
- [ ] Re-read the relevant TanStack Start and Better Auth documentation before
  changing auth, server, or routing behavior.
- [ ] Run `pnpm exec tsc -b`, `pnpm check`, the relevant unit/integration
  tests, and Playwright coverage before marking a track complete.

## Personalised Unread Reactions

Source: `README.md`, Forum index `2a`.

### Product Decisions

- [ ] Define what "unread" means: reactions since the member's last forum
  visit, since their last visit to a topic, or since an explicit read marker.
- [ ] Define when a visit/read marker advances, including SSR navigation,
  client navigation, dismissed notifications, and multiple devices.
- [ ] Decide whether the count includes only reactions to a member's own posts,
  all subscribed topics, or another explicit audience.
- [ ] Decide whether the home-page count is exact, eventually consistent, or
  capped for performance.
- [ ] Record the decisions in an ADR or product contract before schema work.

### Backend Contract

- [ ] Add a persisted, user-scoped read/visit model. Do not derive unread
  status from a global "recent activity" timestamp.
- [ ] Define indexes and retention rules for the new read/visit records.
- [ ] Add a typed API/read-model field for the index greeting count.
- [ ] Ensure anonymous responses expose no user-specific count.
- [ ] Make read-marker writes idempotent and safe for concurrent tabs/devices.
- [ ] Define invalidation/cache behavior so SSR and client navigation display
  the same authoritative count.
- [ ] Add integration coverage for first visit, subsequent visit, reaction
  arrival, multi-device behavior, and unauthorized access.

### Forum UI

- [ ] Replace the current generic greeting count only when the API field is
  available and authenticated.
- [ ] Keep the signed-out index free of personalised wording or counts.
- [ ] Define and implement zero, singular, plural, loading, and API-failure
  copy in Dutch.
- [ ] Preserve the existing desktop and 390px hero hierarchy and avoid adding a
  second index request solely for the count.
- [ ] Add Playwright coverage for authenticated and anonymous index variants.

### Acceptance Criteria

- [ ] A member sees only the count defined by the approved contract.
- [ ] Reloading or opening another tab does not double-count or clear unread
  state unexpectedly.
- [ ] Anonymous visitors cannot infer member activity from the response.
- [ ] The index remains within its established read-request budget.

## Forgot Password

Source: `README.md`, forgot-password frame in `4b-sign-up-forgot-password.png`.

### Security and Product Decisions

- [ ] Confirm the mail delivery provider, sender identity, reset URL origin,
  token lifetime, and development/test delivery strategy.
- [ ] Confirm Better Auth's supported password-reset primitives for the pinned
  version rather than hand-rolling tokens.
- [ ] Decide whether completing a reset revokes other sessions and document the
  session policy.
- [ ] Use the same success response for unknown and known email addresses to
  prevent account enumeration.
- [ ] Define request rate limits per IP and per normalized email address.
- [ ] Define token single-use, expiry, invalid-token, and replay behavior.

### Backend Work

- [ ] Configure the Better Auth reset endpoint/callback and server-only mail
  integration; never expose mail credentials or reset secrets to the client.
- [ ] Add request validation, rate limiting, audit-safe logging, and a generic
  success response.
- [ ] Add the reset-completion endpoint/handler with password validation and
  token verification.
- [ ] Apply the approved session-revocation policy after a successful reset.
- [ ] Add integration tests for known/unknown accounts, expired/reused/invalid
  tokens, rate limits, password validation, and session behavior.

### Routes and UI

- [ ] Add a dedicated forgot-password request route with email, loading,
  submitted, validation-error, and generic service-error states.
- [ ] Recreate the bottom `4b` reference frame only after the request route has
  a real contract.
- [ ] Add a reset-completion route that accepts the token safely, requests and
  confirms a new password, and reports invalid/expired links without leaking
  account information.
- [ ] Turn `Wachtwoord vergeten?` on sign-in into a real link only after the
  request route is deployed.
- [ ] Preserve logical keyboard order, visible focus, native autocomplete, and
  the existing Dutch error-announcement conventions.
- [ ] Add Playwright coverage for request submission, generic confirmation,
  invalid/reset-token states, successful completion, and mobile layout.

### Acceptance Criteria

- [ ] Requesting a reset produces indistinguishable UI and HTTP behavior for
  existing and non-existing accounts.
- [ ] Reset tokens cannot be reused or accepted after expiry.
- [ ] Mail credentials, raw reset tokens, and private account details never
  appear in browser bundles, logs, or user-facing errors.
- [ ] The sign-in link works end to end only when the reset route is available.

## News App

Source: low-fidelity `5a-news-sketch.png`.

### Discovery and Domain Design

- [ ] Define the news domain: article lifecycle, authors, categories, drafts,
  publication scheduling, revisions, and moderation ownership.
- [ ] Identify the authoritative content source and whether articles are stored
  locally, fetched from a CMS, or synchronized from another system.
- [ ] Define public/private visibility, SEO/SSR needs, image storage, and
  cache-invalidation policy.
- [ ] Validate the lead story, side rail, forum cross-links, and three-card grid
  against representative real data before selecting route shapes.
- [ ] Produce a proper high-fidelity product design; use the sketch only for
  shell, palette, and overall editorial direction.

### Implementation Plan

- [ ] Define API contracts, database schema/migrations, and typed read models.
- [ ] Add a `news` route area and mark news active in `AppShell` without
  regressing forum shell behavior.
- [ ] Implement category navigation in the second row from real news taxonomy.
- [ ] Build article list, detail, empty, loading, error, and not-found states.
- [ ] Implement forum cross-links only where their destination and ownership are
  explicit in the content model.
- [ ] Add unit/integration tests for publication and visibility rules, then
  Playwright coverage for desktop/mobile navigation and article reading.

### Acceptance Criteria

- [ ] The news information architecture is backed by a documented content
  contract rather than fixture-shaped UI.
- [ ] Forum and news routes share shell tokens but retain independent secondary
  navigation and cache policies.
- [ ] Public article pages have correct SSR metadata, canonical URLs, and
  not-found behavior.

## Direct Messages App

Source: low-fidelity `5b-dm-sketch.png`.

### Discovery and Safety Decisions

- [ ] Define participant model: one-to-one/group conversations, membership,
  blocking, invitations, leaving, and deletion/retention semantics.
- [ ] Define message lifecycle: draft, sent, edited, deleted, reported, and
  moderation visibility.
- [ ] Define receipts, unread state, date dividers, pagination, and ordering
  rules, including multiple devices and concurrent sends.
- [ ] Define abuse controls: rate limits, block/report tooling, audit access,
  attachment policy, and moderator boundaries.
- [ ] Decide whether delivery is polling, server-sent events, websockets, or
  another mechanism before choosing client state/caching behavior.
- [ ] Produce a proper high-fidelity product design; use the sketch only for
  shell, palette, and conversational direction.

### Implementation Plan

- [ ] Write an ADR for message ownership, privacy, retention, delivery, and
  moderation boundaries.
- [ ] Define schema/migrations and API contracts for conversations, members,
  messages, receipts, and unread counters.
- [ ] Add authorization integration tests proving participants, blocked users,
  and moderators see only permitted data/actions.
- [ ] Add a `dm` route area and mark DM active in `AppShell` with no secondary
  navigation row.
- [ ] Build conversation list, thread, composer, empty/loading/error states,
  and pagination from the approved contract.
- [ ] Add end-to-end coverage for sending, ordering, unread/receipt behavior,
  access revocation, reports, and 390px interaction targets.

### Acceptance Criteria

- [ ] No API or client cache exposes another member's private conversations.
- [ ] Message ordering and unread/receipt state remain correct across reloads
  and concurrent clients.
- [ ] Abuse and moderation actions are enforceable server-side, not merely
  hidden in the UI.

## Fotoboek App

Source: shell/theme direction only; no current screen or app exists.

### Discovery and Domain Design

- [ ] Define the product scope: personal gallery, shared albums, comments,
  reactions, tags, search, and moderation.
- [ ] Define album/photo ownership, visibility, collaboration, deletion,
  retention, and reporting rules.
- [ ] Choose image storage, upload limits, transformations, thumbnail strategy,
  and CDN/cache policy.
- [ ] Define metadata, EXIF handling, privacy stripping, alt text, and content
  moderation requirements.
- [ ] Produce route maps and high-fidelity designs before implementation.

### Implementation Plan

- [ ] Record storage, privacy, authorization, and image-processing boundaries
  in an ADR.
- [ ] Define schema/migrations and typed APIs for albums, media, visibility,
  and moderation.
- [ ] Add secure upload handling with server-side MIME/size validation and
  authorization checks; do not trust browser-reported file metadata.
- [ ] Add a fotoboek route area using the shared shell/theme and its own
  secondary navigation only when the product taxonomy requires one.
- [ ] Implement gallery, album, detail, upload, empty/loading/error, and
  not-found states from approved designs.
- [ ] Add integration tests for privacy and upload validation plus Playwright
  coverage for responsive browsing and upload flows.

### Acceptance Criteria

- [ ] Private media cannot be discovered through URLs, API responses, cached
  thumbnails, or client-side route data.
- [ ] Image processing is bounded, validated, and does not block regular forum
  requests.
- [ ] The app's visual system reuses shared tokens without treating an
  unvalidated forum reference as a product design.

## Completion Record

- [ ] Link completed implementation issues/PRs here as each deferred track is
  delivered.
- [ ] Update the corresponding deferred entry in `README.md` only after its
  acceptance criteria and verification commands pass.
