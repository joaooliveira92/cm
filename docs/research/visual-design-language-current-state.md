# Current visual state of the cm-clone desktop renderer

**Question:** What is the current visual state of the `@cm-clone/desktop` renderer,
catalogued against the CM 03/04 UI reference at `docs/design/ui-elements.md`?

**Sources:**
- Primary: every file under `apps/desktop/src/renderer/` (10 screen files, 1 CSS,
  1 App shell, ~15 match-screen component files)
- Reference: `docs/design/ui-elements.md` (CM 03/04 UI analysis, 533 lines)
- Context: `CONTEXT.md`, `.scratch/visual-design-language/map.md`

---

## 1. Colors and backgrounds

### Current clones

All main screens use **Tailwind `slate` palette exclusively**:

| Role | Tailwind class | Approximate hex | Files |
|------|---------------|----------------|-------|
| Page background | `bg-slate-950` | `#020617` | Every `min-h-screen` wrapper (9 screens) |
| Primary text | `text-slate-100` | `#f1f5f9` | Every main wrapper |
| Secondary text | `text-slate-400` | `#94a3b8` | Subtitles, metadata, labels |
| Tertiary text | `text-slate-500` | `#64748b` | Disabled/empty states |
| Input/text bg | `bg-slate-800` | `#1e293b` | Inputs, selects, button defaults |
| Button default | `bg-slate-700` | `#334155` | Secondary/tertiary buttons |
| Button hover | `hover:bg-slate-600` | `#475569` | All hover states |
| Button active | `bg-slate-100 text-slate-900` | white/`#111827` | Active tab, selected option |
| Accent green | `bg-green-700` | `#15803d` | "Create Career" button (App.tsx:356) |
| Accent red | `bg-red-*` / `text-red-400` | various | Error messages, sacked status |
| Accent amber | `bg-amber-*` / `text-amber-400` | various | Warnings, low pillars |
| Divider/border | `border-slate-700/800` | `#334155` / `#1e293b` | Table headers, nav borders |

Key evidence: `App.tsx:178` nav, `SquadScreen.tsx:39` wrapper, `LeagueTableScreen.tsx:45`,
`TacticsScreen.tsx:115`, `TransfersScreen.tsx:191`, `MatchDayScreen.tsx:555`,
`SeasonSummaryScreen.tsx:33` — all use identical `bg-slate-950 p-8 text-slate-100` pattern.

### Match-screen component (different visual language entirely)

The `match-screen/styles.css` (967 lines) defines **its own design token system**:

- **Chrome-blue gradients** — `--chrome-blue-top: #416a9f`, `--chrome-blue-mid: #214d84`,
  `--chrome-blue-bottom: #153963` — used for sidebar, scoreboard, tabs, command bar
- **Panel colors** — `--panel-dark: rgba(5, 12, 13, 0.72)`, strong variant `0.86`
- **Text highlight** — `--text-highlight: #fff400` (yellow), `--text-warning: #ff7200`
- **Score box** — white-to-gray gradient with dark border, beveled appearance via
  `inset` box-shadows
- **Stadium overlay** — `rgba(0, 0, 0, 0.72)` backdrop
- **Focus ring** — `--focus-ring: #fff400`
- **Version label** — `#8ae860` (green)

This component is not used by any active screen (`MatchDayScreen.tsx` implements its own
separate match flow). It's only mounted in `MatchScreenDemo.tsx`, which is not wired into
the App shell.

### Comparison to CM 03/04

| Attribute | CM 03/04 | Clone (main screens) | Clone (match-screen) |
|-----------|----------|---------------------|----------------------|
| Background | Football-themed photo or skin per screen, or default | Flat `bg-slate-950` everywhere — identical per screen | Dark semi-transparent overlay over stadium image |
| Panel surfaces | Beveled, shaded panels | Flat surfaces — no bevels, no gradients | Semi-transparent panels via `--panel-dark` with border+shadow |
| Title bars | Shaded title bars with club/logo imagery | No title bars; `<h1>` headings use `text-2xl font-bold` | Chrome-blue gradient scoreboard/tab bars |
| Skin support | Multiple skins (traditional, Ter), context-sensitive | None | CSS custom properties but no runtime switching |

**Judgment:** (b) modern/modified — flat dark slate vs CM's beveled/skinned approach.
The match-screen component is a closer approximation (chrome-blue gradients, panel
borders, box-shadows) but is unconnected to the live app.

---

## 2. Typography

### Current clones

**Font family:** No explicit font-family override. Uses Tailwind's default sans-serif
stack (`ui-sans-serif, system-ui, ...`).

**Font sizes used across all screens:**

| Tailwind class | px (Tailwind 4 default) | Usage |
|---------------|------------------------|-------|
| `text-xs` | 12px | Attribute column headers, attribute values, instruction sliders, status badges, sub-labels |
| `text-sm` | 14px | Table body text, metadata, labels, nav items, section content |
| `text-base` | 16px | *(not used explicitly)* |
| `text-lg` | 18px | Section headings ('Fixtures', 'Incoming Bids', 'Review Career') |
| `text-xl` | 20px | Match day score heading |
| `text-2xl` | 24px | Page titles (club name, screen name) |

**Line heights:** Tailwind defaults (tight: `text-sm` is ~1.25rem, `text-xs` is ~1rem).

### Match-screen component

- Font family: `--font-primary: "Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif`
- Team name: 26px
- Score number: 24px
- Section heading: 17px
- Tab label: 12px
- Incident name: 13px
- Clock minute: 28px
- Version label: 9px

### Comparison to CM 03/04

CM 03/04 used "small typography intended for 1024×768" (docs/design/ui-elements.md:23).
The original game rendered at 1024×768 and used small, compact fonts (likely
MS Sans Serif / Tahoma equivalents at 8–11pt). The clone's `text-sm` (14px) on modern
high-DPI displays produces roughly equivalent apparent size, but the default sans-serif
doesn't match CM's specific small-screen compact look.

The match-screen component's use of Trebuchet MS is a deliberate retro choice that more
closely approximates the CM 03/04 feel.

**Judgment:** (b) modern/modified — similar apparent size but different font family,
no compact/abbreviated typography strategy.

---

## 3. Panels and containers

### Current clones

**No beveled or shaded panels exist in the main screens.** The renderer uses:

- **Flat wrappers:** `<main className="min-h-screen bg-slate-950 p-8 text-slate-100">`
  on every screen — the background IS the page.
- **Table containers:** `overflow-x-auto` with no panel wrapper (`SquadScreen.tsx:45`,
  `LeagueTableScreen.tsx:64`)
- **Single panel instance:** `SeasonSummaryScreen.tsx:39` —
  `<section className="mt-6 rounded border border-slate-800 p-4">` — a flat bordered box,
  the only panel-like element in the main screens.
- **MatchDayScreen collapsible panel:** `MatchDayScreen.tsx:216` —
  `<section className="mt-4 rounded border border-slate-800 bg-slate-900">` —
  used for tactics/substitutions control.
- **No title bars.** `<h1>` headings float at the top of the page without any
  title-bar chrome, background, or icon area.
- **No bordered section dividers** beyond `<hr>`-equivalent `border-b` on table rows.

### Match-screen component

- Semi-transparent panels with `border-radius: 6px`, `border: 1px solid rgba(255,255,255,0.30)`,
  box-shadow with multiple layers (inset + drop shadow)
- Panel backgrounds use `--panel-dark: rgba(5, 12, 13, 0.72)` — partially transparent
- Fixture panel uses `--panel-dark-strong: rgba(6, 10, 12, 0.86)`
- Section headings have `--text-highlight` color with bottom border

### Comparison to CM 03/04

| Feature | CM 03/04 | Clone main | Clone match-screen |
|---------|----------|-----------|-------------------|
| Beveled panels | Throughout all screens | None | Semi-transparent with border+shadow, not beveled per se |
| Shaded title bars | Club/logo zone, gradient or image | None | Chrome-blue gradient bars |
| Bordered sections | Consistent beveled borders | Flat `border-slate-800` | Panel borders with light color |
| Background images per screen | Club/player/screen-specific | None | Stadium background planned (overlay exists) |

**Judgment:** (c) no equivalent for beveled/shaded panels in main screens.
Match-screen has a panel system (border-radius, shadow, semi-transparent) but it's
not wired into the app.

---

## 4. Tables

### Current clones

**Squad table** (SquadScreen.tsx:46):
- Base columns: Name, Age, Positions, OVR
- +30 attribute columns (Technical, Mental, Physical, Goalkeeping) — ~34 columns total
- Row height: `py-1` (4px vertical padding) — compact by modern web standards
- Text: `text-sm` (14px) for main columns, `text-xs` (12px) for attribute cells
- Header: `border-b border-slate-700 text-slate-400`, `py-1 pr-4`
- Row separator: `border-b border-slate-800`
- Wrapper: `overflow-x-auto` (horizontal scroll)

**League table** (LeagueTableScreen.tsx:65):
- 10 columns: #, Club, P, W, D, L, GF, GA, GD, Pts
- Row height: `py-1`, text-sm
- Same border pattern

**Transfers tables** (TransfersScreen.tsx):
- Three separate tables: Incoming Bids (5 cols), Outgoing Bids (6 cols), Free Agents (6 cols), Market (6 cols)
- Row height: `py-1`, text-sm
- Action columns with inline buttons/inputs

### Comparison to CM 03/04

| Aspect | CM 03/04 | Clone |
|--------|----------|-------|
| Column density | Very dense, 8-12 visible columns | Up to ~34 columns (squad) with horizontal scroll |
| Row spacing | Tight (likely 14-16px) | `py-1` = 4px padding ≈ 20-22px row height — slightly looser |
| Text size | 8-9pt (~11px) | 12-14px — larger |
| Status abbreviations | Lmp, Inj, Sus, etc. | No abbreviations — full text for positions/familiarity |
| Header styling | Shaded column headers | Flat `border-b` with muted text |
| Clickable rows | Player names = data objects + navigation | Player names are plain text (no click-to-profile) |
| View switching | Multiple data views (General, Contract, Fitness, Form, Transfer, Selection) | No view switching — all attributes shown at once |

**Notable:** The squad table displays ALL attributes in a single view (SquadScreen.tsx:53-57),
whereas CM 03/04 used view-switching tabs to reduce horizontal crowding. The clone's
approach produces a very wide table that requires horizontal scrolling.

**Judgment:** (b) modern/modified — similar density ambition but no abbreviations,
no view switching, no clickable rows, and significantly wider column set.

---

## 5. Buttons and controls

### Current clones

**Button pattern** (appears ~50+ times across all screens):

```
className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
```

- `rounded`: small border-radius (`0.25rem`)
- Flat background, no border, no shadow
- On hover: slightly lighter background
- No 3D/beveled appearance, no inset shadow, no border-lines
- Active tab variation: `bg-slate-100 text-slate-900` (white bg, dark text)
- Disabled: `opacity-50` with `cursor-not-allowed`

**Input controls:**
- `<select>`: `rounded bg-slate-800 px-2 py-1` (flat, no border)
- `<input>`: `rounded bg-slate-800 px-3 py-2 text-slate-100` (flat, no border)

**Special buttons:**
- "Create Career": `rounded bg-green-700 px-4 py-2 hover:bg-green-600` (green accent)
- Instruction sliders (tactics): segmented button groups with active/inactive state
- Pillar controls: `flex h-8 w-8 items-center justify-center rounded bg-slate-700`

### Match-screen component

- Gradient-based 3D-ish buttons with `box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.3)`
- `border: 2px solid var(--panel-border-dark)` on all buttons
- Active state inverts the gradient direction
- Continue button uses highlight color for text
- Nav items have rounded corners, gradient backgrounds, icon support

### Comparison to CM 03/04

CM 03/04 used "rectangular, text-led controls" with beveled 3D borders — buttons were
distinct raised elements on the interface surface. The clone's buttons are flat, borderless,
and rely solely on background color for affordance.

**Judgment:** (b) modern/modified — flat buttons vs CM's beveled raised controls.

---

## 6. Navigation structure

### Current clones

**Navigation model:** Flat tab bar at top of screen (`App.tsx:178`):

```tsx
<nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-2 text-sm">
  {["squad", "tactics", "transfers", "league table", "fixtures", "match day", "season summary"].map(...)}
</nav>
```

- Flat string-based tabs, all peers, no hierarchy
- Active tab highlighted with `bg-slate-100 text-slate-900`
- "Back to saves" button on the right
- **No date display, no Continue button, no contextual navigation**

**Home screen:** Two sections — "Continue career" (list of saves) and "New career" (start button)

**Creation flow:** Step indicator (1. Manager → 2. Club → 3. Review) with numbered circles,
linear forward-only progression. No hierarchical navigation.

### Comparison to CM 03/04

| Feature | CM 03/04 | Clone |
|---------|----------|-------|
| Primary nav | Hierarchical club context → menus | Flat tab bar — all peers |
| Date bar | Persistent date with Continue/Go to Match | Nowhere in main screens |
| Contextual menus | Actions menu per object/player | None |
| Screen history | Recent screens navigation | None |
| Club context | Club selection establishes context for all screens | Single club per save, no switching |
| Title bar image | Club logo/photo in title bar | None |
| Continue button | Primary CTA, context-sensitive label | No persistent Continue — only "Advance Calendar" button on league table |

**Match-screen component:** Has a sidebar with Prev/Next, Continue Game button, and nav items
(Manager Profile, Competitions, Nations & Clubs, Screen History, Game Options) — this is closer
to CM's hierarchical model but it's not integrated into the app.

**Judgment:** (c) no equivalent — flat tab bar is fundamentally different from CM's
hierarchical context + persistent date/Continue navigation.

---

## 7. Status and data display

### Current clones

**Player status:** No status indicators at all. The squad table shows:
- Name, Age, Positions (with familiarity and position rating), OVR
- All attributes as numeric values

**No status abbreviations exist** — no Lmp, Inj, Sus, Wnt, Bid, Yel, Int, Fgn, Ine, Wpm,
Tir, Cup, Loa, Lst, Unh, Unf, Sct, Yth, Req, or any equivalent.

**Position display:** Full text — `"DMC (Natural, 72)"` or similar format.

**No morale indicator, fitness bar, condition percentage, form indicator, or hot/cold streak.**

### Comparison to CM 03/04

CM 03/04's squad table was dense with abbreviated status markers beside player names.
The clone renders player data as raw numbers without any status layer.

**Judgment:** (c) no equivalent — the entire abbreviated status vocabulary is absent.

---

## 8. Skins and theming

### Current clones

**No skin/theme system exists.** Evidence:

- `index.css` is a single line: `@import "tailwindcss";`
- No CSS custom properties in the main app (no `:root` variables)
- Every color is hardcoded as Tailwind utility classes per component
- No theming context, no `ThemeProvider`, no runtime style switching
- All screens share the identical `bg-slate-950` background

**Match-screen component** defines CSS custom properties in its `styles.css` but:
- Properties are used only within that single component
- No runtime switching mechanism
- Not wired into any theme system

CM 03/04 supported multiple skins (traditional, Ter) with configurable:
- Font size, panel colors, button styling, background treatment, title-bar imagery
- Context-sensitive backgrounds per screen (club, player, stadium)

**Judgment:** (c) no equivalent — no skin system, no theme variables, no customization.

---

## 9. Icons and visual markers

### Current clones

use https://lucide.dev/ icons

### Comparison to CM 03/04

CM 03/04 used "limited use of iconography" — icons and color augmented text but did not
replace it.  The main screens use no icons at all — all information
is text-only.

**Judgment:** use icons not emojis

---

## Summary matrix

| Item | Verdict | Detail |
|------|---------|--------|
| 1. Colors & backgrounds | (b) modern/modified | Flat dark slate throughout. No bevels, no gradients, no context sensitivity. Match-screen has chrome-blue+panel-dark language but is unconnected. |
| 2. Typography | (b) modern/modified | Tailwind default sans-serif, text-xs (12px) to text-2xl (24px). Similar apparent size to CM but different face, no compact strategy. |
| 3. Panels & containers | (c) no equivalent | No beveled or shaded panels in main screens. Flat page background, table wrappers only. Single `rounded border` panel exists. |
| 4. Tables | (b) modern/modified | Compact rows (py-1) but wider text (12-14px vs CM's ~11px). No status abbreviations, no view-switching tabs, no clickable rows. ~34-column squad table forces horizontal scroll. |
| 5. Buttons & controls | (b) modern/modified | Flat `rounded bg-slate-700 hover:bg-slate-600` pattern throughout. No 3D beveling, no borders, no inset shadows. |
| 6. Navigation | (c) no equivalent | Flat tab bar of peer screens. No hierarchical context, no date/Continue bar, no contextual menus, no screen history. |
| 7. Status & data display | (c) no equivalent | No status abbreviations, morale, fitness, form indicators. Raw numeric display only. |
| 8. Skins & theming | (c) no equivalent | No theme system, no CSS variables in main app, no runtime switching. Single fixed palette. |
| 9. Icons & visual markers | (b) modern/modified | Lucide icons in match-screen component. No emojis. |

---

## Recommendations for the implementator

**What may be relied on:**
- All main screens share `bg-slate-950 p-8 text-slate-100` as their wrapper — consistent
  flat dark theme.
- Tables consistently use `py-1` rows, `text-sm` body, `border-b border-slate-800` separators.
- Buttons consistently use `rounded bg-slate-700 px-3 py-1 hover:bg-slate-600`.
- Active/selected state consistently uses `bg-slate-100 text-slate-900`.
- Match-screen component (`components/match-screen/`) has its own independent visual language
  that is NOT wired into the app — it can be treated as a parallel prototype.
- There is exactly one CSS file in use (`index.css` — a single `@import "tailwindcss"` line)
  plus the match-screen component's `styles.css` (which is only imported by `MatchScreenDemo.tsx`).

**What remains a design choice (explicitly not findings):**
- **Skin system architecture.** Research confirms zero skin support exists. Whether to add one
  is a design decision — the map's "Not yet specified" section flagged this correctly.
- **Abbreviation vocabulary.** The entire CM 03/04 abbreviated status system is absent.
  Which abbreviations to implement (if any) and whether to use text, icons, or hybrid is design.
- **Match-screen visual direction.** The existing `match-screen/` component shows one possible
  retro-chrome visual language; the live `MatchDayScreen.tsx` uses the same flat-slate palette
  as the rest of the app. Which direction the match screen takes is a design decision.
- **Navigation model.** The flat tab bar works but does not match CM's hierarchical model.
  Whether to keep tabs, add a sidebar, or implement CM-style contextual navigation is design.

---

## Gaps

- **Font rendering differences.** I could not verify the exact font family or rendering of
  CM 03/04's UI on original hardware. The `docs/design/ui-elements.md` describes "small typography
  intended for 1024×768" but does not specify the exact font. A CM 03/04 installation or
  screenshot analysis at pixel level would be needed.
- **CM 03/04 button appearance at pixel level.** The reference document says "rectangular,
  text-led controls" and "beveled panels" but I could not verify the bevel dimensions,
  highlight/shadow colors, or whether buttons had 1px or 2px borders.
- **Match-screen component origin.** The `components/match-screen/` directory appears to be
  a scaffold or prototype from a different effort (`retro-match-screen`?). Its relationship
  to the live `MatchDayScreen.tsx` is undocumented. The map notes this as an active uncertainty.
- **No pixel measurements available.** The research is based on Tailwind class names and
  CSS property values, not on rendered pixel measurements. Actual rendering depends on
  the user's DPI, font rendering engine, and viewport size.