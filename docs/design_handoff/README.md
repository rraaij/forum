# Forum redesign implementation checklist

This document tracks the implementation of the warm teal and orange Modernist
redesign for `apps/forum` and the shared UI foundation for the future news,
fotoboek, and dm apps.

The screenshots in [`screens/`](./screens/) are the visual source of truth.
`Forum Redesign.dc.html` is a static design reference, not production code to
copy. Recreate it with SolidJS, TanStack Router, Tailwind v4, and daisyUI 5.

## Status legend

- `- [x]` means implemented in the current worktree.
- `- [ ]` means work remains. Items marked **Partial** describe what already exists and
  what must still be completed.
- **Deferred** means deliberately out of the current forum scope, not done.

## Scope and fidelity

- [x] Treat forum screens `2a` through `4e` as high-fidelity references for
  color, typography, spacing, structure, responsive behavior, and Dutch copy.
- [x] Treat news `5a` and dm `5b` as low-fidelity direction only.
- [x] Do not implement superseded turn 1 (`1a` through `1f`).
- [x] Finish every existing `apps/forum` route, including category and board
  listing routes that still use the legacy presentation.
- [x] Keep all existing mutations, route guards, server boundaries, and data
  behavior intact while replacing presentation.

## Implementation order

Execute this queue in order. The detailed sections below are acceptance criteria
grouped by design surface; their section numbers are not a second implementation
sequence.

1. Integrate `AppShell` in `apps/forum/src/routes/__root.tsx`, including the
   light-only document setup, Dutch root copy, signed-in/signed-out variants,
   and functional mobile navigation.
2. Remove legacy global styling that conflicts with the design system, then
   audit shared primitives and icons. The shell must land first because it
   removes most route-wide legacy classes and framing workarounds.
3. Finish and integrate shared empty, loading, error, and no-access states so
   routes can use them while their layouts are completed.
4. Complete existing routes in dependency order: index; category/board listings;
   topic detail; profile and change-password modal; admin; sign in/sign up.
   Finish desktop and 390px behavior together for each route rather than
   postponing responsive work.
5. Implement the new search/results surface and connect cursor-compatible
   pagination after the existing read routes share their final row patterns.
6. Verify behavior, accessibility, visual fidelity, TypeScript, Biome, and
   relevant automated tests after every route slice, followed by one final
   cross-route pass.
7. Keep forgot password blocked on its backend prerequisite, and keep the news,
   dm, and fotoboek apps deferred until their product work starts.

## Phase 1: Design system foundations

Reference: all screens, especially [`4a-app-shell.png`](./screens/4a-app-shell.png).

### Theme and typography

- [x] Add the daisyUI 5 theme and Tailwind token ramps in
  `packages/config/theme.css`.
- [x] Import `@forum/config/theme.css` from `apps/forum/src/styles.css`.
- [x] Define the teal `brand-*`, orange `flame-*`, and neutral `ink-*` ramps.
- [x] Set semantic colors: contrast-adjusted primary teal `#0c746e`, restricted
  secondary orange `#e07b1e` with dark content, white/teal surfaces, dark
  neutral, deep-teal success, and dark-red destructive error.
- [x] Set every radius, depth, and noise token to zero.
- [x] Configure Archivo for body/UI copy and Newsreader 600 for headings.
- [x] Load the required Google Font weights in the root document.
- [x] Add the global teal `:focus-visible` outline.
- [x] Change the root document language from `en` to `nl` so assistive
  technology applies Dutch pronunciation and language rules.
- [x] Remove the unsupported dark-theme toggle and local-storage theme state.
  The supplied theme is light-only.

### Visual rules

- [x] Provide semantic strong rules (`2px` base content) and hairlines (`1px`
  brand 300) in the shared theme.
- [x] Remove the page-wide decorative gradients and unused category-collapse
  animation from `apps/forum/src/styles.css`.
- [x] Replace the temporary global listing-header image treatment with a flat
  semantic neutral surface. Route-owned listing cards remain part of their
  scheduled redesign.
- [x] Use strong rules only between major sections and hairlines between rows
  and cells across every route.
- [x] Remove rounded cards, blurred shadows, gradients, and floating surfaces
  from routes and global styles; retain only the modal's specified hard shadow.
- [x] Remove raw colors from application and shared UI presentation; semantic
  color values now live in the shared theme tokens.
- [x] Remove non-color transitions and collapse animations. The design permits
  color changes only; nothing should slide, scale, or fade.
- [x] Restrict orange to active app navigation, pinned tags, unread counts,
  category numerals, the active admin branch, orange-tinted error panels, active
  search filters, news kickers, and search marks. Keep ordinary actions and
  links teal.
- [x] Standardise field labels, metadata, body copy, and post measure/leading to
  the typography rules visible in the references.

### Shared primitives

- [x] Implement and export `AppShell`, `Avatar`, `Badge`, `Button`, `Field`,
  `Modal`, `Tag`, `EmptyState`, `ErrorState`, `Skeleton`, and `Pagination` from
  `packages/ui`.
- [x] Make avatars square and support letter-tile fallbacks.
- [x] Implement the modal's only allowed shadow as a hard `6px 6px` offset.
- [x] Support numbered and opaque-cursor modes in `Pagination`.
- [x] Audit every primitive against the screenshots and remove any remaining
  radius, shadow, transition, or orange-action violations.
- [x] Add Lucide for interface icons and replace text glyphs such as the mobile
  menu, admin grip, and hierarchy branch with `menu`, `grip-vertical`, and
  `corner-down-right` icons.
- [x] Verify shared primitives meet WCAG keyboard, name, contrast, and disabled
  state requirements.

## Phase 2: Shared app shell - `4a`

Reference: [`4a-app-shell.png`](./screens/4a-app-shell.png).

- [x] Build a reusable 50px neutral `AppShell` with brand, app navigation,
  account area, unread count, optional secondary row, and mobile menu slots.
- [x] Integrate the shell in the forum root. Replace the legacy
  sticky blue two-row header in `apps/forum/src/routes/__root.tsx` with the
  shared `AppShell` while preserving session, profile-avatar preview, admin
  navigation, sign-out, and route outlet behavior.
- [x] Render app links in this order: `forum`, `nieuws`, `fotoboek`, `dm`; mark
  forum active with orange text and bold weight.
- [x] Implement the signed-in account variant with unread badge, Dutch greeting,
  and 30px avatar.
- [x] Implement the signed-out account variant with teal `inloggen` link and a
  small primary `Aanmelden` action.
- [x] Render forum breadcrumbs in the shared second row from typed matched
  loader data, without an extra request, unsafe cast, or hydration-only portal.
- [x] Remove the root `max-w-7xl px-4 py-2` wrapper and route-level negative
  margin workarounds after the shell owns page framing.
- [x] Replace English root labels and account menu copy with the specified Dutch
  voice.
- [x] Implement the 390px shell as brand, unread badge, avatar/account action,
  and a labeled menu button with a functional mobile navigation disclosure.

## Phase 3: Shared states and cross-route behavior - `4c`, `4d`

References:
[`4c-dialog-and-states.png`](./screens/4c-dialog-and-states.png) and
[`4d-search-pagination.png`](./screens/4d-search-pagination.png).

### System states - `4c`

- [x] Implement the white empty state with title, explanatory copy, and optional
  primary action.
- [x] Implement the row skeleton with square avatar blocks and fading final row;
  do not use a spinner.
- [x] Implement the orange-tinted error state with optional retry action and
  error-code metadata.
- [x] Add and export a no-access state on `base-300` with `Terug naar het forum`
  and `Andere account gebruiken` actions.
- [x] Replace ad hoc loading copy with `Skeleton` where a page-sized content
  shape is known, beginning with profile and admin access checks.
- [x] Replace ad hoc route/root error cards with `ErrorState`, Dutch copy, and a
  real retry action where retry is possible.
- [x] Use the no-access state for failed admin access rather than silently
  redirecting every unauthorised user.
- [x] Add representative empty, loading, error, and no-access states to route or
  component tests.

### Search and pagination - `4d`

- [x] Build the reusable pagination presentation.
- [x] Implement a functional search route and connect it from the app shell.
- [x] Add the 44px search field and primary `Zoeken` action.
- [x] Add removable filter chips with orange reserved for the active filter.
- [x] Add result count and sorting controls.
- [x] Add result rows with avatar, linked title, two-line snippet, metadata, and
  `<mark>` highlights using flame 100/flame 700.
- [x] Integrate `Pagination` with search results using an opaque cursor and a
  bounded URL-backed previous-page trail.
- [x] Prefer previous/next cursor controls when the backend cannot cheaply
  provide numbered pages; do not manufacture page totals from keyset cursors.

### Global interactions

- [x] Make every list row a single semantic link where the design presents the
  whole row as clickable.
- [x] Apply light-row hover color and teal title hover consistently.
- [x] Apply teal chip hover consistently.
- [x] Ensure primary pressed states use brand 700.
- [x] Use relative Dutch times everywhere except the index's right-hand clock
  column.
- [x] Keep copy Dutch, sentence case, conversational, and lightly wry. Preserve
  original English subforum names.

## Phase 4: Forum screens

### Forum index - `2a`

Reference: [`2a-index.png`](./screens/2a-index.png).
Route: `apps/forum/src/routes/index.tsx`.

- [x] Implement the greeting/hero band, Newsreader heading, lede, and two-action
  layout.
- [x] Implement wrapping subforum chips with teal hover.
- [x] Implement the three-column category grid with orange numerals, metadata,
  and latest-activity footer.
- [x] Implement the four-row active-topic section with relative and clock times.
- [x] Add an empty category state.
- [x] Replace hard-coded greeting and lede statistics with counts derived from
  the forum-index response.
- [ ] **Deferred - backend prerequisite.** Add a personalised unread-reaction
  count once the product has a
  per-user last-visit/unread contract; do not infer unread state from recent
  activity.
- [x] Wire `Nieuw topic` to a valid creation-capable category and `Actieve topics` to the
  active-topic section or route.
- [x] Provide real category descriptions instead of slug-specific presentation
  copy when the read model can supply them.
- [x] Show the topic starter and authoritative reply count in active-topic
  metadata without adding a request or database query.
- [x] Verify category cards and topic rows are fully clickable and keyboard
  accessible.
- [x] Pixel-check desktop and 390px layouts after the root shell is integrated.

### Category and board listings

Routes:
`apps/forum/src/routes/categories/$categorySlug/index.tsx` and
`apps/forum/src/routes/categories/$categorySlug/subcategories/$boardId/index.tsx`.

- [x] Replace legacy `card`, rounded, shadow, zebra-table, gradient-header, and
  English-copy presentation with the shared Modernist system.
- [x] Move breadcrumbs into the app shell's forum secondary row.
- [x] Restyle `ForumGrid`, `PageHeader`, `TopicsList`, and create-topic controls
  using the same category/topic-row vocabulary as `2a` and `2b`.
- [x] Convert not-found and empty states to shared system-state components with
  Dutch copy.
- [x] Preserve cursor loading and canonical topic navigation behavior.
- [x] Verify nested boards at every supported hierarchy depth.

### Topic detail - `2b`

Reference: [`2b-topic.png`](./screens/2b-topic.png).
Routes: both topic routes under `apps/forum/src/routes/categories/`.

- [x] Implement breadcrumbs, pinned metadata, title, opener identity, and header
  actions.
- [x] Implement the responsive postbit structure with author panel and white
  post body.
- [x] Implement quote snapshots, inline editing, deletion, and deleted-post
  presentation.
- [x] Implement reaction and vote mutations.
- [x] Implement the reply composer and quote-to-reply flow.
- [x] Preserve cursor-based reply loading and deduplicated topic view recording.
- [x] Move breadcrumbs into the shell's secondary row once shell integration is
  complete.
- [x] Wire `Abonneer` to durable in-app reply notifications, with creator
  auto-subscription, self-reply suppression, an unread inbox, and exact-reply
  navigation.
- [x] Wire `Voorbeeld` as a safe plain-text draft preview.
- [x] Add the designed post permalink/copy-link action.
- [x] Add the ghost `+ reactie` affordance or document that the fixed quick
  reaction set intentionally replaces it.
- [x] Extend the read model for member-since date, lifetime post count, profile
  tagline,
  and role so the author column can match the reference without placeholders.
- [x] Correct admin role display so it depends on the post author, not whether
  the signed-in viewer is both author and admin.
- [x] Translate server/auth mutation errors before rendering them to users.
- [x] Complete the 390px compact author header and composer behavior described
  in the mobile phase.

### Profile - `3a`

Reference: [`3a-profile.png`](./screens/3a-profile.png).
Route: `apps/forum/src/routes/profile.tsx`.

- [x] Implement the profile header and save action.
- [x] Implement the 300px identity sidebar, avatar controls, member metadata,
  and role tag.
- [x] Implement the two-column personal details form with the existing profile
  fields.
- [x] Implement the responsive photo gallery, 12-photo limit, add slot, removal,
  and used-place counter.
- [x] Implement recent activity rows and topic links.
- [x] Show authoritative retained-row totals from the complete activity
  response: posts include opening and soft-deleted posts, while destructive
  purges remove content from the totals.
- [x] Replace `Laden…` and the signed-out paragraph with shared loading and
  no-access/auth-required states.
- [x] Remove the inert `alles bekijken` link and keep this summary aligned with
  the reference's three most recent activity rows.
- [x] Complete the change-password modal work listed below.
- [x] Verify save, avatar, gallery, validation, success, and error flows at
  desktop and 390px widths.

### Admin board management - `3b`

Reference: [`3b-admin-boards.png`](./screens/3b-admin-boards.png).
Route: `apps/forum/src/routes/admin/boards.tsx`.

- [x] Preserve the client navigation guard and server-side endpoint guards.
- [x] Implement the metrics/header layout and two-column hierarchy/editor view.
- [x] Keep `selectedId` state and re-resolve the selected board after loader
  invalidation.
- [x] Implement hierarchy indentation, category numerals, selected branch, and
  editor/create panel.
- [x] Preserve create, update, move, and destructive purge behavior.
- [x] Wire `Volgorde opslaan` to persist complete sibling groups atomically.
- [x] Implement accessible drag/reorder behavior or replace the drag affordance
  with explicit ordering controls.
- [x] Replace text glyphs for the grip and hierarchy branch with Lucide icons.
- [x] Supply and display real recursive post counts for every hierarchy row.
- [x] Align the editor fields with the reference: parent selection plus the two
  square toggle rows, while retaining required domain fields in an appropriate
  advanced section.
- [x] Persist and enforce both board policies: guest-hidden subtrees return 404
  to anonymous viewers, and closed topic creation still permits staff.
- [x] Use the shared no-access state for unauthorised users and a skeleton while
  access is being checked.
- [x] Verify that mobile hierarchy controls remain usable without relying on a
  clipped desktop table.

### Sign in - `3c`

Reference: [`3c-sign-in.png`](./screens/3c-sign-in.png).
Route: `apps/forum/src/routes/auth/sign-in.tsx`.

- [x] Implement the teal poster/form split, copy, overlapping avatars, and
  member activity line.
- [x] Implement email/password submission, loading state, field error styling,
  and the sign-up callout.
- [x] Translate Better Auth error messages into safe Dutch user-facing copy
  instead of displaying provider messages directly.
- [x] Wire `Ingelogd blijven` to Better Auth's `rememberMe` option, defaulting
  it on while allowing a browser-session-only cookie when unchecked.
- [x] Hide `Wachtwoord vergeten?` until the deferred enumeration-safe reset
  flow exists so it is not mistaken for an available action.
- [x] Document the hard-coded recent-member names/counts as editorial poster
  copy rather than live forum metrics.
- [x] Verify the stacked narrow layout, focus order, autofill, and error
  announcement.

### Sign up - `4b` top frame

Reference:
[`4b-sign-up-forgot-password.png`](./screens/4b-sign-up-forgot-password.png).
Route: `apps/forum/src/routes/auth/sign-up.tsx`.

- [x] Implement the matching teal poster/form split.
- [x] Keep the form aligned with the existing contract: name, email, and a
  minimum-eight-character password only.
- [x] Preserve submission, loading, autocomplete, and sign-in navigation.
- [x] Translate Better Auth error messages into safe Dutch user-facing copy.
- [x] Document hard-coded member names/counts as editorial poster copy rather
  than live forum metrics.
- [x] Verify the stacked narrow layout, focus order, autofill, and error
  announcement.

## Phase 5: Proposals and supporting UI

### Forgot password - `4b` bottom frame

Reference:
[`4b-sign-up-forgot-password.png`](./screens/4b-sign-up-forgot-password.png).

- [ ] **Deferred - backend prerequisite.** Add a Better Auth password-reset
  endpoint with enumeration-safe responses before creating this route.
- [ ] Add email, submitted, loading, and error state once the backend contract
  exists.
- [ ] Implement the email form and post-submit confirmation from the reference.
- [ ] Turn the sign-in screen's forgot-password text into a real link only after
  this route exists.

### Change password modal - `4c` top-left

Reference:
[`4c-dialog-and-states.png`](./screens/4c-dialog-and-states.png).

- [x] Preserve the Better Auth change-password call with
  `revokeOtherSessions: false`.
- [x] Build a reusable accessible native-dialog `Modal` with controlled close,
  Escape, backdrop, title, footer, and offset shadow behavior.
- [x] Promote `ChangePasswordDialog` to the shared controlled modal.
- [x] Stack current, new, and confirm password fields vertically with Dutch
  labels and errors.
- [x] Add primary `Wijzigen`, ghost/surface `Annuleren`, and the footer note
  `Je blijft ingelogd`.
- [x] Close and clear all credential values after success or cancellation and
  restore focus to the trigger.
- [x] Test validation mismatch, minimum length, provider failure, success,
  Escape, backdrop close, and keyboard focus behavior.

## Phase 6: Narrow/mobile - `4e`

Reference: [`4e-mobile-390px.png`](./screens/4e-mobile-390px.png).

- [x] Complete and visually compare every high-fidelity screen at 390px. Keep
  shipped breadcrumbs, subscription, permalink/edit controls, and 44px targets
  as documented functional additions where the static mobile frame omits them.
- [x] Collapse the shell to brand, badge, avatar/account, and functional menu.
- [x] Let the index heading reduce from 54px to 42px on its current narrow
  breakpoint.
- [x] Match the reference's 28px mobile index heading.
- [x] Stack index category cells and profile/admin columns at narrow widths.
- [x] Collapse postbits from two columns to an inline compact author header.
- [x] Match the reference's 30px post avatar and compact metadata placement.
- [x] Replace the mobile reply composer with the compact single-line field and
  `Plaats` action shown in `4e`, without removing the full desktop composer.
- [x] Make every interactive touch target at least 44px, including vote,
  reaction, photo removal, admin, pagination, and account controls.
- [x] Prevent horizontal clipping in category tables, admin hierarchy, auth
  forms, modal content, long topic titles, and breadcrumbs.

## Phase 7: Deferred sibling apps - `5a`, `5b`

### News - `5a`

Reference: [`5a-news-sketch.png`](./screens/5a-news-sketch.png).

- [ ] **Deferred - no news app exists yet.** Create a proper product design when
  implementation starts; use this frame only as shell/palette direction.
- [ ] Reuse `AppShell` with news active and category tabs in the second row.
- [ ] Validate the lead story, side rail, forum cross-links, and three-card grid
  against real news data before implementation.

### DM - `5b`

Reference: [`5b-dm-sketch.png`](./screens/5b-dm-sketch.png).

- [ ] **Deferred - no dm app exists yet.** Create a proper product design when
  implementation starts; use this frame only as shell/palette direction.
- [ ] Reuse `AppShell` with dm active and no second row.
- [ ] Validate conversation states, unread counts, moderation actions,
  receipts, date dividers, and composer behavior against the future messaging
  contract before implementation.

### Fotoboek

- [ ] **Deferred - no fotoboek screen or app exists in this bundle.** Reuse the
  shell and theme, but design its routes before building them.

## Phase 8: Verification and completion criteria

### Automated checks

- [x] Run `pnpm exec tsc -b` after implementation changes.
- [x] Run `pnpm check` after implementation changes.
- [x] Run the relevant unit/integration tests for auth, profile, forum reads,
  topic interactions, and board management.
- [x] Add or update Playwright coverage for shell navigation, auth, index,
  topic/reply interactions, profile editing, admin access, and mobile behavior.

### Visual and accessibility checks

- [x] Compare every high-fidelity screen at its desktop reference size.
- [x] Compare every high-fidelity screen at 390px.
- [x] Verify zero unintended radius, shadow, gradient, or motion.
- [x] Verify orange is used only in its restricted roles.
- [x] Verify heading/body fonts and required weights load correctly.
- [x] Verify keyboard focus order and visible focus on every route.
- [x] Verify landmarks, heading order, labels, error announcements, dialog
  behavior, and current-page/current-item semantics.
- [x] Verify color contrast and 200% zoom/reflow.
- [x] Verify all interactive controls perform an action; remove or disable any
  remaining visual-only controls.

### Definition of done

- [x] All forum items above are checked except explicitly deferred sibling apps
  and the backend-gated forgot-password proposal.
- [x] No existing forum route presents the legacy blue/rounded/shadow design.
- [x] Shared shell and state components are integrated, not merely exported.
- [x] Desktop and 390px screenshots pass visual review.
- [x] Type, formatting, unit/integration, and end-to-end checks pass.

## Reference files

- `Forum Redesign.dc.html`: pannable/zoomable static design document.
- `support.js`: design-document runtime, not application code.
- `theme.css`: original handoff theme source; implemented in
  `packages/config/theme.css`.
- `screens/2a-index.png`
- `screens/2b-topic.png`
- `screens/3a-profile.png`
- `screens/3b-admin-boards.png`
- `screens/3c-sign-in.png`
- `screens/4a-app-shell.png`
- `screens/4b-sign-up-forgot-password.png`
- `screens/4c-dialog-and-states.png`
- `screens/4d-search-pagination.png`
- `screens/4e-mobile-390px.png`
- `screens/5a-news-sketch.png`
- `screens/5b-dm-sketch.png`

Screens are captured at 1x, so pixel measurements read directly. Turn 1 is not
included because it is superseded.
