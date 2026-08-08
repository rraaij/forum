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
- [ ] Finish every existing `apps/forum` route, including category and board
  listing routes that still use the legacy presentation.
- [ ] Keep all existing mutations, route guards, server boundaries, and data
  behavior intact while replacing presentation.

## Current critical path

Complete these phases in order. The shared shell and removal of legacy root
layout constraints affect every screen and should land before screen-level
pixel tuning.

1. Integrate `AppShell` in `apps/forum/src/routes/__root.tsx`.
2. Remove legacy global styling that conflicts with the design system.
3. Finish and integrate shared system-state components.
4. Complete desktop routes and all currently inert controls.
5. Complete the 390px layouts and touch-target pass.
6. Run visual, accessibility, type, and formatting verification.

## Phase 1: Design system foundations

Reference: all screens, especially [`4a-app-shell.png`](./screens/4a-app-shell.png).

### Theme and typography

- [x] Add the daisyUI 5 theme and Tailwind token ramps in
  `packages/config/theme.css`.
- [x] Import `@forum/config/theme.css` from `apps/forum/src/styles.css`.
- [x] Define the teal `brand-*`, orange `flame-*`, and neutral `ink-*` ramps.
- [x] Set semantic colors: primary teal `#0e7f78`, restricted secondary orange
  `#e07b1e`, white/teal surfaces, dark neutral, deep-teal success, and dark-red
  destructive error.
- [x] Set every radius, depth, and noise token to zero.
- [x] Configure Archivo for body/UI copy and Newsreader 600 for headings.
- [x] Load the required Google Font weights in the root document.
- [x] Add the global teal `:focus-visible` outline.
- [ ] Change the root document language from `en` to `nl` so assistive
  technology applies Dutch pronunciation and language rules.
- [ ] Remove the unsupported dark-theme toggle and local-storage theme state,
  or explicitly design and tokenise a dark theme before retaining it. The
  supplied theme is light-only.

### Visual rules

- [x] Provide semantic strong rules (`2px` base content) and hairlines (`1px`
  brand 300) in the shared theme.
- [ ] Use strong rules only between major sections and hairlines between rows
  and cells across every route.
- [ ] Remove rounded cards, blurred shadows, gradients, and floating surfaces
  left in the root layout, category routes, board routes, and global styles.
- [ ] Remove raw colors from application and shared UI presentation. Known
  conflicts include the blue root header and `.forum-page-header-bg`.
- [ ] Remove non-color transitions and collapse animations. The design permits
  color changes only; nothing should slide, scale, or fade.
- [ ] Restrict orange to active app navigation, pinned tags, unread counts,
  category numerals, the active admin branch, news kickers, and search marks.
  Keep ordinary actions and links teal.
- [ ] Standardise field labels, metadata, body copy, and post measure/leading to
  the typography rules visible in the references.

### Shared primitives

- [x] Implement and export `AppShell`, `Avatar`, `Badge`, `Button`, `Field`,
  `Modal`, `Tag`, `EmptyState`, `ErrorState`, `Skeleton`, and `Pagination` from
  `packages/ui`.
- [x] Make avatars square and support letter-tile fallbacks.
- [x] Implement the modal's only allowed shadow as a hard `6px 6px` offset.
- [x] Support numbered and opaque-cursor modes in `Pagination`.
- [ ] Audit every primitive against the screenshots and remove any remaining
  radius, shadow, transition, or orange-action violations.
- [ ] Add Lucide for interface icons and replace text glyphs such as the mobile
  menu, admin grip, and hierarchy branch with `menu`, `grip-vertical`, and
  `corner-down-right` icons.
- [ ] Verify shared primitives meet WCAG keyboard, name, contrast, and disabled
  state requirements.

## Phase 2: Shared app shell - `4a`

Reference: [`4a-app-shell.png`](./screens/4a-app-shell.png).

- [x] Build a reusable 50px neutral `AppShell` with brand, app navigation,
  account area, unread count, optional secondary row, and mobile menu slots.
- [ ] **Partial - integrate the shell in the forum root.** Replace the legacy
  sticky blue two-row header in `apps/forum/src/routes/__root.tsx` with the
  shared `AppShell` while preserving session, profile-avatar preview, admin
  navigation, sign-out, and route outlet behavior.
- [ ] Render app links in this order: `forum`, `nieuws`, `fotoboek`, `dm`; mark
  forum active with orange text and bold weight.
- [ ] Implement the signed-in account variant with unread badge, Dutch greeting,
  and 30px avatar.
- [ ] Implement the signed-out account variant with teal `inloggen` link and a
  small primary `Aanmelden` action.
- [ ] Let each route/app supply its own second row. Use it for forum breadcrumbs;
  do not hard-code page-specific navigation in `AppShell`.
- [ ] Remove the root `max-w-7xl px-4 py-2` wrapper and route-level negative
  margin workarounds after the shell owns page framing.
- [ ] Replace English root labels and account menu copy with the specified Dutch
  voice.
- [ ] Implement the 390px shell as brand, unread badge, avatar/account action,
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
- [ ] Add and export a no-access state on `base-300` with `Terug naar het forum`
  and `Andere account gebruiken` actions.
- [ ] Replace ad hoc loading copy with `Skeleton` where a page-sized content
  shape is known, beginning with profile and admin access checks.
- [ ] Replace ad hoc route/root error cards with `ErrorState`, Dutch copy, and a
  real retry action where retry is possible.
- [ ] Use the no-access state for failed admin access rather than silently
  redirecting every unauthorised user.
- [ ] Add representative empty, loading, error, and no-access states to route or
  component tests.

### Search and pagination - `4d`

- [x] Build the reusable pagination presentation.
- [ ] Implement a functional search route or search results surface. The current
  root search input is legacy and has no submit behavior.
- [ ] Add the 44px search field and primary `Zoeken` action.
- [ ] Add removable filter chips with orange reserved for the active filter.
- [ ] Add result count and sorting controls.
- [ ] Add result rows with avatar, linked title, two-line snippet, metadata, and
  `<mark>` highlights using flame 100/flame 700.
- [ ] Integrate `Pagination` with search results and topic/category lists where
  pagination is required.
- [ ] Prefer previous/next cursor controls when the backend cannot cheaply
  provide numbered pages; do not manufacture page totals from keyset cursors.

### Global interactions

- [ ] Make every list row a single semantic link where the design presents the
  whole row as clickable.
- [ ] Apply light-row hover color and teal title hover consistently.
- [ ] Apply teal chip hover consistently.
- [ ] Ensure primary pressed states use brand 700.
- [ ] Use relative Dutch times everywhere except the index's right-hand clock
  column.
- [ ] Keep copy Dutch, sentence case, conversational, and lightly wry. Preserve
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
- [ ] **Partial - replace placeholder content with real data.** The greeting's
  unread count and lede statistics are currently hard-coded.
- [ ] Wire `Nieuw topic` to a valid creation flow and `Actieve topics` to the
  active-topic section or route.
- [ ] Provide real category descriptions instead of slug-specific presentation
  copy when the read model can supply them.
- [ ] Show the designed author and reaction counts in active-topic metadata.
  Current data substitutes a board topic count for the intended reply count.
- [ ] Verify category cards and topic rows are fully clickable and keyboard
  accessible.
- [ ] Pixel-check desktop and 390px layouts after the root shell is integrated.

### Category and board listings

Routes:
`apps/forum/src/routes/categories/$categorySlug/index.tsx` and
`apps/forum/src/routes/categories/$categorySlug/subcategories/$boardId/index.tsx`.

- [ ] Replace legacy `card`, rounded, shadow, zebra-table, gradient-header, and
  English-copy presentation with the shared Modernist system.
- [ ] Move breadcrumbs into the app shell's forum secondary row.
- [ ] Restyle `ForumGrid`, `PageHeader`, `TopicsList`, and create-topic controls
  using the same category/topic-row vocabulary as `2a` and `2b`.
- [ ] Convert not-found and empty states to shared system-state components with
  Dutch copy.
- [ ] Preserve cursor loading and canonical topic navigation behavior.
- [ ] Verify nested boards at every supported hierarchy depth.

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
- [ ] Move breadcrumbs into the shell's secondary row once shell integration is
  complete.
- [ ] Wire `Abonneer`; it is currently an inert button.
- [ ] Wire `Voorbeeld`; it is currently an inert button.
- [ ] Add the designed post permalink/copy-link action.
- [ ] Add the ghost `+ reactie` affordance or document that the fixed quick
  reaction set intentionally replaces it.
- [ ] Extend the read model for member-since date, post count, optional tagline,
  and role so the author column can match the reference without placeholders.
- [ ] Correct admin role display so it depends on the post author, not whether
  the signed-in viewer is both author and admin.
- [ ] Translate server/auth mutation errors before rendering them to users.
- [ ] Complete the 390px compact author header and composer behavior described
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
- [ ] **Partial - replace derived placeholder statistics.** Posts and topics are
  currently inferred from the limited recent-activity response rather than
  authoritative totals.
- [ ] Replace `Laden…` and the signed-out paragraph with shared loading and
  no-access/auth-required states.
- [ ] Make `alles bekijken` navigate to a real complete activity view or remove
  it; it currently jumps to the same short list.
- [ ] Complete the change-password modal work listed below.
- [ ] Verify save, avatar, gallery, validation, success, and error flows at
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
- [ ] Wire `Volgorde opslaan`; it is currently inert.
- [ ] Implement accessible drag/reorder behavior or replace the drag affordance
  with explicit ordering controls.
- [ ] Replace text glyphs for the grip and hierarchy branch with Lucide icons.
- [ ] Supply and display real post counts; the hierarchy currently renders an
  em dash for every row.
- [ ] Align the editor fields with the reference: parent selection plus the two
  square toggle rows, while retaining required domain fields in an appropriate
  advanced section if they cannot be removed.
- [ ] Use the shared no-access state for unauthorised users and a skeleton while
  access is being checked.
- [ ] Verify that mobile hierarchy controls remain usable without relying on a
  clipped desktop table.

### Sign in - `3c`

Reference: [`3c-sign-in.png`](./screens/3c-sign-in.png).
Route: `apps/forum/src/routes/auth/sign-in.tsx`.

- [x] Implement the teal poster/form split, copy, overlapping avatars, and
  member activity line.
- [x] Implement email/password submission, loading state, field error styling,
  and the sign-up callout.
- [ ] Translate Better Auth error messages into safe Dutch user-facing copy
  instead of displaying provider messages directly.
- [ ] Decide whether `Ingelogd blijven` is intentionally omitted or wire it to
  Better Auth session duration; record the decision in this checklist.
- [ ] Keep `Wachtwoord vergeten?` non-interactive until the deferred reset flow
  exists, or hide it so it is not mistaken for a link.
- [ ] Replace hard-coded recent-member names/counts with real data or explicitly
  document them as editorial poster copy.
- [ ] Verify the stacked narrow layout, focus order, autofill, and error
  announcement.

### Sign up - `4b` top frame

Reference:
[`4b-sign-up-forgot-password.png`](./screens/4b-sign-up-forgot-password.png).
Route: `apps/forum/src/routes/auth/sign-up.tsx`.

- [x] Implement the matching teal poster/form split.
- [x] Keep the form aligned with the existing contract: name, email, and a
  minimum-eight-character password only.
- [x] Preserve submission, loading, autocomplete, and sign-in navigation.
- [ ] Translate Better Auth error messages into safe Dutch user-facing copy.
- [ ] Replace hard-coded member names/counts with real data or explicitly
  document them as editorial poster copy.
- [ ] Verify the stacked narrow layout, focus order, autofill, and error
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
- [ ] **Partial - promote `ChangePasswordDialog` to the shared modal.** It is
  currently an English inline card opened from a `details` dropdown.
- [ ] Stack current, new, and confirm password fields vertically with Dutch
  labels and errors.
- [ ] Add primary `Wijzigen`, ghost/surface `Annuleren`, and the footer note
  `Je blijft ingelogd`.
- [ ] Close and clear all credential values after success or cancellation and
  restore focus to the trigger.
- [ ] Test validation mismatch, minimum length, provider failure, success,
  Escape, backdrop close, and keyboard focus behavior.

## Phase 6: Narrow/mobile - `4e`

Reference: [`4e-mobile-390px.png`](./screens/4e-mobile-390px.png).

- [ ] Complete and visually compare every high-fidelity screen at 390px.
- [ ] Collapse the shell to brand, badge, avatar/account, and functional menu.
- [x] Let the index heading reduce from 54px to 42px on its current narrow
  breakpoint.
- [ ] Match the reference's 28px mobile index heading.
- [x] Stack index category cells and profile/admin columns at narrow widths.
- [x] Collapse postbits from two columns to an inline compact author header.
- [ ] Match the reference's 30px post avatar and compact metadata placement.
- [ ] Replace the mobile reply composer with the compact single-line field and
  `Plaats` action shown in `4e`, without removing the full desktop composer.
- [ ] Make every interactive touch target at least 44px, including vote,
  reaction, photo removal, admin, pagination, and account controls.
- [ ] Prevent horizontal clipping in category tables, admin hierarchy, auth
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

- [ ] Run `pnpm exec tsc -b` after implementation changes.
- [ ] Run `pnpm check` after implementation changes.
- [ ] Run the relevant unit/integration tests for auth, profile, forum reads,
  topic interactions, and board management.
- [ ] Add or update Playwright coverage for shell navigation, auth, index,
  topic/reply interactions, profile editing, admin access, and mobile behavior.

### Visual and accessibility checks

- [ ] Compare every high-fidelity screen at its desktop reference size.
- [ ] Compare every high-fidelity screen at 390px.
- [ ] Verify zero unintended radius, shadow, gradient, or motion.
- [ ] Verify orange is used only in its restricted roles.
- [ ] Verify heading/body fonts and all font weights load correctly.
- [ ] Verify keyboard focus order and visible focus on every route.
- [ ] Verify landmarks, heading order, labels, error announcements, dialog
  behavior, and current-page/current-item semantics.
- [ ] Verify color contrast and 200% zoom/reflow.
- [ ] Verify all interactive controls perform an action; remove or disable any
  remaining visual-only controls.

### Definition of done

- [ ] All forum items above are checked except explicitly deferred sibling apps
  and the backend-gated forgot-password proposal.
- [ ] No existing forum route presents the legacy blue/rounded/shadow design.
- [ ] Shared shell and state components are integrated, not merely exported.
- [ ] Desktop and 390px screenshots pass visual review.
- [ ] Type, formatting, unit/integration, and end-to-end checks pass.

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
