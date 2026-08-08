# Handoff: Forum redesign — warm teal & orange, Modernist

## Overview

A visual redesign of the forum app and the shared foundation for three sibling apps
(news, fotoboek, dm) that will live in the same monorepo behind one login.

The direction: Modernist — flat, architectural, zero corner radius, structure drawn
with rules rather than shadows — recolored from the system's stock near-mono red to a
warm **teal primary / orange secondary** palette, with **Newsreader** serif headings
over **Archivo** body text.

Scope of this bundle:
- Every route that exists today in `apps/forum` has a design.
- A shared app shell that all four apps use.
- Empty / loading / error / no-access states.
- A 390px narrow breakpoint.
- Rough sketches for the news and dm apps (not specs — see Fidelity).
- A drop-in DaisyUI 5 theme file.

## About the design files

`Forum Redesign.dc.html` is a **design reference created in HTML** — a prototype showing
intended look and structure. It is **not production code to copy**. Every frame in it is
inline-styled static markup with no real state or data.

The task is to recreate these designs in the existing codebase: **SolidJS + TanStack
Router + Tailwind v4 + daisyUI 5**, using that stack's established patterns. Do not port
the inline styles. Translate them into daisyUI semantic classes and Tailwind utilities,
backed by the theme file described under Design Tokens.

Open the file in a browser. It pans and zooms. Options are labelled `1a`, `2b`, `3c` … —
those ids are used throughout this document.

## Fidelity

**High fidelity** for the forum (turns 2, 3, 4): final colors, type, spacing and copy.
Recreate these closely.

**Low fidelity** for the news and dm apps (turn 5, options `5a` / `5b`): correct palette
and shell, but the layouts are sketches to establish that the system stretches to other
apps. Treat them as direction, not specification. Design properly when those apps start.

**Superseded:** turn 1 (`1a`–`1f`) is the original exploration in the old grey/red
palette. Kept for history. **Do not implement turn 1.**

---

## Foundations

### The app shell (`4a`)

One bar across all four apps. This is the single most reusable thing in the design.

- Height ~50px, `bg-neutral text-neutral-content` (#201e1d on #eef7f6 text).
- Brand at far left, `font-black text-base`, padding `px-[18px] py-[13px]`, with a
  `border-r border-ink-600` separator.
- App links follow: forum · nieuws · fotoboek · dm. `text-[13.5px] px-[14px]`.
  Inactive `text-ink-300`; **active is `text-flame-400` (#e79a4a) + `font-bold`** —
  this is the only navigation use of orange.
- Right side: unread badge (`bg-secondary text-secondary-content`, `text-[11.5px]
  font-extrabold px-[7px] py-[2px]`, square), greeting `text-[13px] text-ink-200`,
  avatar 30×30.
- Signed-out variant replaces greeting/avatar with an `inloggen` link
  (`text-brand-400`) and a small primary "Aanmelden" button.

Below the bar each app draws its **own** second row: `bg-base-300`, `border-b-2
border-base-content`, `text-[13.5px] px-[18px] py-[9px]`, holding breadcrumb (forum),
filter tabs (news), or album scopes (fotoboek). The dm app has no second row.

### Structural rules

Only two weights, everywhere:
- **Strong**: `border-2 border-base-content` (#201e1d) — between major page sections.
- **Hairline**: `border border-brand-300` (#b0dbd7) — between rows and cells.

No shadows except one: the dialog in `4c` uses `6px 6px 0 rgba(32,30,29,.12)` — a hard
offset block, not a blur. Nothing else floats.

### Surfaces

| Role | Hex | Where |
|---|---|---|
| `base-100` | `#ffffff` | post bodies, form panels, article text |
| `base-200` | `#eef7f6` | page ground |
| `base-300` | `#d7ecea` | category cells, author columns, side panels, composers |

### Where orange is allowed

Orange (`#e07b1e`) is the second accent and is **restricted**. Use it only for:
active nav marker · pinned/sticky tags · unread counts · category numerals · the active
branch in the admin hierarchy · section kickers in the news app · `<mark>` search
highlights.

Never for buttons, links, or general emphasis. Teal carries those.

### Typography

- Headings — Newsreader 600, `letter-spacing: -0.01em`. Page h1 42px, card h3 20–23px.
- Body, tables, buttons, form labels, meta — Archivo.
- Field labels: `text-[12px] font-bold uppercase tracking-[.05em] text-brand-700`.
- Meta lines: `text-[12.5px]–[13px] text-brand-700` (#0b5f5b).
- Body copy in a tinted panel: `text-brand-800` (#08494a).
- Post body: `text-base leading-[1.68] max-w-[70ch] text-wrap-pretty`.

Google Fonts:
`Archivo:wght@400;500;600;700;800;900` and `Newsreader:opsz,wght@6..72,400..700`.

---

## Screens

Each entry lists the design id, the route it implements, and the source files it replaces.

### 1. Forum index — `2a`
**Route** `apps/forum/src/routes/index.tsx`

Hero band on `base-200`: greeting line (`17 nieuwe reacties` in `text-flame-700`), h1 at
54px/1.0, and a right column with a lede paragraph and two buttons (primary "Nieuw
topic", `bg-base-300` "Actieve topics"). Below it a wrapping row of subforum chips
(`bg-base-300 border border-brand-300 px-[11px] py-[6px] text-[12.5px] font-semibold`),
which hover to `bg-primary text-primary-content`.

Then a **3-column category grid**, `border-t-2`, each cell `bg-base-300 p-[24px_26px]`
with a `border-r border-brand-300` between: a 38×38 orange numeral square, an h3, a
description, a `2 subforums · 412 topics` line, and a footer rule with the last poster's
avatar and a relative time.

Finally "Waar nu over gepraat wordt": four rows, each avatar + title + `author in
Subforum · N reacties · relative time` + right-aligned clock time.

**Components**: `AppShell`, `Button`, `Tag`, `Avatar`, `CategoryCard`, `TopicRow`.

### 2. Topic detail — `2b`
**Route** `apps/forum/src/routes/categories/…` (topic view)

Breadcrumb in the shell bar. Header band: pinned tag + `in SolidJS · 37 reacties · 1.104
keer bekeken`, h1 34px `max-w-[30ch]`, opener line with avatar, then "Abonneer" and
"Reageer" buttons right-aligned.

**Postbit**: `grid-cols-[210px_1fr]`. Left `aside` on `bg-base-300` with a 60×60 avatar,
username 17px/800, `lid sinds 2021 · 1.402 posts`, and an optional italic tagline. Admins
get a `text-primary` role line. Right column `bg-base-100 p-[22px_30px_24px]`: a meta row
(`vrijdag 18:40 · eerste post` left, quoten/link/bewerken right), the body, then a
reaction row — emoji reaction buttons on `bg-base-300`, a ghost "+ reactie", and a
right-aligned vote stack `▲ 24 ▼`.

Quotes: `bg-base-300 border-l-4 border-accent p-[12px_16px]`, attribution above.
Inline code: `bg-base-300 px-[5px] py-[1px]`.

Composer at the bottom on `bg-base-300`, `border-t-2`: avatar + "Wat denk jij, marijn?",
a textarea (`bg-base-100`, min-height 104px), primary "Plaats reactie", ghost
"Voorbeeld", and a right-aligned note.

**Components**: `AppShell`, `PostBit`, `Quote`, `ReactionRow`, `VoteStack`, `Composer`.

### 3. Profile — `3a`
**Route** `apps/forum/src/routes/profile.tsx`
**Replaces** `features/profile-edit/ProfileForm.tsx`, `ProfileGallery.tsx`,
`features/profile-activity/ActivityPanel.tsx`

Header band with h1 "Je profiel" and two right-aligned buttons ("Wachtwoord wijzigen"
ghost, "Profiel opslaan" primary).

`grid-cols-[300px_1fr]`. Left `aside` on `bg-base-300`: 88×88 avatar, username 21px,
email, "Avatar kiezen" / "Verwijderen", then a stat list separated by a hairline —
lid sinds / posts / topics gestart / rol (the role is an orange `Tag`).

Right column on `bg-base-100`, three stacked sections divided by hairlines:
- **Over jou** — `grid-cols-2 gap-[16px_20px]`: Weergavenaam, Geboortedatum, Woonplaats,
  Website, then Over mij spanning both columns. Field names map 1:1 to
  `ProfileForm.tsx` (`displayName`, `dateOfBirth`, `location`, `website`, `about`).
- **Je fotoboek** — `grid-cols-6 gap-2`, square cells, one dashed "+ toevoegen" slot.
  Counter reads `4 van de 12 plekken gebruikt`.
- **Wat je laatst deed** — rows with a type tag (`reactie` teal / `topic` orange), the
  title, and a relative time.

### 4. Admin — board management — `3b`
**Route** `apps/forum/src/routes/admin/boards.tsx`
**Replaces** `features/board-management/BoardManagerPage.tsx`

Header band: `3 categorieën · 12 subforums · 1.284 topics`, h1 "Forums beheren",
"Volgorde opslaan" + "Nieuw forum".

`grid-cols-[1fr_340px]`. Left is the hierarchy on `bg-base-100`: a column header row
(Naam / Topics / Posts / Acties, `text-[11.5px] font-bold uppercase tracking-[.06em]`),
then rows. **Depth is expressed by left padding**: category `pl-[30px]`, depth 1
`pl-[62px]`, depth 2 `pl-[90px]`, depth 3 `pl-[118px]`, each nested row prefixed by a
`└` in `text-brand-300`. Categories sit on `bg-base-200` with a drag handle (`⠿`) and an
orange numeral square. The **row being edited** is `bg-flame-100 border-l-[3px]
border-secondary` with its text and figures in `text-flame-700`.

Right `aside` on `bg-base-300`, `border-l-2`: an orange "Bewerken" kicker, the board
name as h4, then Naam / Omschrijving / Bovenliggend forum fields on `bg-base-100`, two
toggle rows separated by hairlines (on = `bg-primary` with a 16×16 knob at right; off =
`bg-brand-300` with the knob at left — both square), Opslaan / Annuleren, and a
`text-flame-700` delete link at the bottom.

### 5. Sign in — `3c`
**Route** `apps/forum/src/routes/auth/sign-in.tsx`

`grid-cols-[1.05fr_1fr]`. Left is a **teal poster half** (`bg-primary
text-primary-content`, `p-[44px_40px_40px]`): an uppercase kicker, h1 46px/1.02 in
`base-200`, a lede in `base-300`, and at the bottom a row of three overlapping 34×34
avatars (`-ml-2`, `border-2 border-primary`) with `1.284 leden waren vandaag online`.

Right on `bg-base-100`: h2 "Inloggen", sub-line, the error state (`bg-flame-100
border-l-[3px] border-secondary p-[10px_14px] text-flame-700`), E-mailadres and
Wachtwoord fields (the errored field takes `border-flame-400`), a "Ingelogd blijven"
checkbox next to a "Wachtwoord vergeten?" link, and a full-width 44px primary button.
Below a `border-t-2`: "Nog geen account?" with a `bg-base-300` button.

Fields match `sign-in.tsx` (email, password). "Ingelogd blijven" is **not** in the
current code — it's a proposal; drop it or wire it to Better Auth's session length.

### 6. Sign up — `4b` (top frame)
**Route** `apps/forum/src/routes/auth/sign-up.tsx`

Same poster/form split as `3c`, different copy. Fields are exactly those in
`sign-up.tsx`: **Naam, E-mailadres, Wachtwoord** with a "Minimaal 8 tekens" hint
matching the existing `minLength={8}`. No username, no confirm field, no terms
checkbox — those were considered and cut for parity with the code.

### 7. Forgot password — `4b` (bottom frame) — PROPOSED
No route exists. The frame is badged "Voorstel — nog geen route". Left: email field and
"Stuur de link". Right on `bg-base-300`: the post-submit confirmation. Build only if you
want the flow; it needs a Better Auth reset endpoint first.

### 8. Change password dialog — `4c` (top-left) — PROPOSED AS DIALOG
**Currently** `features/profile-edit/ChangePasswordDialog.tsx` renders inline as a card
section, not a dialog. The design proposes promoting it to a real modal.

Fields match the code exactly: currentPassword / newPassword / confirmPassword, min 8.
The design stacks them vertically; the code uses `sm:grid-cols-3`. Either works — the
vertical stack reads better in a narrow modal.

Dialog: `bg-base-100 border-2 border-base-content`, offset block shadow, title 22px,
a footer divided by a hairline with primary "Wijzigen", ghost "Annuleren", and a
right-aligned "Je blijft ingelogd" note (reflects `revokeOtherSessions: false`).

### 9. System states — `4c`
Four states, each a component in `packages/ui`:

- **Empty** (`bg-base-100`): h4 21px, one explanatory sentence `max-w-[42ch]`, one
  primary action. Copy: "Nog niets hier" / "Start het eerste topic".
- **Loading** (`bg-base-100`): a **skeleton, never a spinner** — 34×34 avatar blocks and
  11px/9px bars in `bg-base-300` fading to `bg-base-200` on the last row.
- **Error** (`bg-flame-100`): orange kicker, h4, explanation in `text-flame-800`, a
  `bg-secondary text-secondary-content` retry button, and a small `foutcode 502 · 10:04`.
  This is the one place a solid orange button is correct.
- **No access** (`bg-base-300`): h4, explanation, primary "Terug naar het forum" plus a
  ghost "Andere account gebruiken". Backs the role guard in `admin/boards.tsx`.

### 10. Search & pagination — `4d`
Search bar: a 44px input with `border-base-content` plus a primary "Zoeken". Filter
chips below — the **active filter is orange** with an `✕`, the rest `bg-base-300`.
Result count and sort sit right-aligned.

Results: avatar, title, a 2-line snippet with `<mark>` highlights (`bg-flame-100
text-flame-700`), and a meta line.

Pagination on `border-t-2`: ghost "← Vorige", then 34×34 square page cells — current is
`bg-primary text-primary-content font-extrabold`, others `bg-base-300` — an ellipsis, the
last page, "Volgende →" on `bg-base-300`, and `pagina 1 van 9` right-aligned.

Note: the backend uses keyset pagination, so numbered pages may not be cheap. If the API
only exposes cursors, ship Vorige/Volgende and drop the numerals.

### 11. Narrow / mobile — `4e`
Breakpoint drawn at **390px**.

- Shell collapses to brand + badge + avatar + `☰`.
- h1 drops 54px → 28px.
- Category cells stack full width, hairline between.
- **The postbit stops being two columns**: the author becomes a 30×30 avatar with the
  name and meta inline above the body.
- Composer becomes a single-line input pinned above the fold with a "Plaats" button.
- Every touch target is **≥44px**.

### 12. News app — `5a` — SKETCH
Second row holds category tabs. A `grid-cols-[1.5fr_1fr]` lead: article on `bg-base-100`
with an orange "Voorpagina" tag, h1 40px, a 16:8 image, a lede at 16.5px, and a footer
rule. Right rail on `bg-base-300` — "Ook vandaag" items with orange category kickers,
then a `border-t-2` block "Nu op het forum" linking into the forum. Below, a 3-up card
grid with 4:3 images.

### 13. DM app — `5b` — SKETCH
`grid-cols-[320px_1fr]`, min-height 520px. Left on `bg-base-300`: header with unread
count and a full-width "Nieuw bericht", then conversation rows — the active one is
`bg-base-200 border-l-[3px] border-primary`; unread ones carry an orange count badge and
bold their preview. Right: a conversation header on `bg-base-200` with block/report
actions, then messages — **incoming** are `bg-base-300` left-aligned, **own** are
`bg-primary text-primary-content` in a `flex-row-reverse` row with a "gelezen" receipt.
A date divider centers between days. Composer on `bg-base-300`, `border-t-2`.

---

## Interactions & behavior

- **Row hover**: `bg-[#eae9e9]` on light rows; on hover the title turns
  `text-primary`. Whole rows are links, not just their titles.
- **Chip hover**: `bg-primary text-primary-content border-primary`.
- **Focus**: `outline: 2px solid var(--color-primary); outline-offset: 2px` — set
  globally in the theme file. Never leave the browser default.
- **Pressed**: one step past the base — `bg-brand-700` for primary.
- **Transitions**: none beyond color. Nothing slides, scales, or fades. Motion is not
  part of this system.
- **Times are relative** everywhere ("20 min geleden", "net", "gisteren"), except the
  right-hand clock column on the index, which is absolute.
- **Copy voice**: Dutch, sentence case, conversational, lightly wry. Subforum names stay
  in their original English ("Web Development", "Self-Hosting"). Never shout in caps
  except in small uppercase kickers and field labels.

## State

Nothing in the design needs new state beyond what the routes already carry. Two
additions if you build the proposals: `forgotPassword` (email, submitted, error) and
promoting `ChangePasswordDialog` to modal open/close.

The admin page's edit panel implies a `selectedBoardId` — currently
`BoardManagerPage.tsx` should be checked for whether it already has one.

## Design tokens

All tokens live in **`packages/config/theme.css`** (included in this bundle). It is a
daisyUI 5 `@plugin "daisyui/theme"` block plus a Tailwind v4 `@theme` block, matching the
repo's Tailwind 4.3 / daisyUI 5.7 setup.

Wire it up — in each app's `src/styles.css`:

```css
@import "tailwindcss";
@import "@forum/config/theme.css";
```

…replacing the current `@plugin "daisyui";` line.

Semantic roles:

| Token | Hex | Use |
|---|---|---|
| `primary` | `#0e7f78` | buttons, links, active controls |
| `primary-content` | `#eef7f6` | on primary |
| `secondary` | `#e07b1e` | the restricted orange (see above) |
| `secondary-content` | `#fdf2e4` | on secondary |
| `accent` | `#2ba39a` | avatars, quote bars |
| `neutral` | `#201e1d` | the app bar, all body text |
| `base-100/200/300` | `#ffffff` / `#eef7f6` / `#d7ecea` | surfaces |
| `error` | `#8f2f14` | destructive only |
| `warning` | `#e07b1e` | same as secondary |
| `success` | `#0a6b66` | deep teal, deliberately not green |

Ramps are namespaced `--color-brand-*` (teal), `--color-flame-*` (orange),
`--color-ink-*` (greys), each 100–900, so they don't collide with Tailwind's built-in
`teal-*` / `amber-*` utilities.

**`primary` is `brand-600`, not `brand-500`.** `brand-500` (#2ba39a) is the lighter mid
teal used for avatars and quote bars.

Geometry: all radii **0**. Border width 1px. Depth 0, noise 0.

Two decisions worth reviewing: `error` (#8f2f14) is the only color outside both ramps —
orange couldn't carry destructive when it already means "active/pinned". And `success` is
deep teal rather than green, to keep the palette tight. Both are one-line changes.

## Assets

None. Every image in the design is a grey placeholder block. Avatars are letter tiles
(square, `bg` from the ink or teal ramp, `font-extrabold`, initial in `base-200`) — the
existing `packages/ui/src/components/Avatar.tsx` should be restyled to match: square,
not round.

Icons: Lucide, per the design system. The design uses only three glyphs — `☰`, `⠿`
(drag), `└` (tree) — replace with Lucide `menu`, `grip-vertical`, `corner-down-right`.

## Suggested build order

1. Drop in `theme.css`, verify the existing forum still renders. The token swap alone
   gets you most of the way.
2. Build `AppShell` in `packages/ui` from `4a`, then `EmptyState`, `ErrorState`,
   `Skeleton`, `Pagination`, `Field`, `Tag`. Restyle the existing `Button`, `Badge`,
   `Avatar`, `Modal` to semantic classes only — no raw hexes anywhere in `packages/ui`.
3. Screens, forum first: index → topic → profile → admin → auth.
4. News and dm get proper designs when those apps start.

## Files in this bundle

- `Forum Redesign.dc.html` — the design document. Open in a browser; pan and zoom.
  Options are labelled with their ids.
- `support.js` — runtime required by the design document. Not part of the app.
- `theme.css` — the daisyUI theme. Goes to `packages/config/theme.css`.
- `screens/` — a PNG of every design, named by id:
  - `2a-index.png`, `2b-topic.png`
  - `3a-profile.png`, `3b-admin-boards.png`, `3c-sign-in.png`
  - `4a-app-shell.png`, `4b-sign-up-forgot-password.png`,
    `4c-dialog-and-states.png`, `4d-search-pagination.png`, `4e-mobile-390px.png`
  - `5a-news-sketch.png`, `5b-dm-sketch.png` (sketches — see Fidelity)

  Captured at 1× so pixel measurements read true. Turn 1 is not included; it is
  superseded.
