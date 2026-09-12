# 03: The first club-scoped route

Type: grilling
Blocked by: None (can start immediately)
Status: resolved

## Question

No route in this app takes a club id. The navigable destinations are `squad`, `tactics`, `league`,
`fixtures`, `transfers`, `news`, `match`, `seasonSummary`, `manager`, plus the pre-career flow — all
of them scoped to the save, none to a club. This effort introduces the first one, at
`club/$clubId/staff`, and the segment will be reused by every club screen that follows.

Settle:

- **The navigation adapter's shape.** `navigateCareer` takes a typed destination union. Decide how a
  club id rides on it and whether `club` is a destination with a leaf or a leaf in its own right.
- **Where you enter from.** League table rows, fixture rows, and transfer rows all name clubs today
  and none of them is clickable. Decide which become entry points in this effort and which are left
  for later — this is the difference between a screen you can reach and a screen that exists.
- **How you get back.** These entry points are lateral, not hierarchical: you reach a rival's staff
  page from the league table and you are still mid-season on your own club's clock. Decide what Back
  means here and whether the shell's existing chrome already answers it.
- **Whether the screen registry, focus coordinator, and keymap need anything** for a route that
  varies by parameter. Every shipped screen has a fixed `screenId`; a parameterised one may not.

Deliberately not deciding what the page *shows* — that is ticket 04, which this unblocks.

## Answer

**One new closed destination `clubStaff` carries the club id, the URL reserves the reusable
`club/$clubId` segment, and the league table is this effort's single entry point.**

- **The navigation adapter's shape.** `CareerDestination` gains
  `{ readonly type: "clubStaff"; readonly saveId: SaveId; readonly clubId: ClubId }`, resolved by
  `resolveDestination` to `/career/$saveId/club/$clubId/staff`. The club segment is deliberately
  `club/$clubId` so every club screen that follows reuses it. `clubStaff` is a leaf in its own
  right for now — the codebase's pattern is one union member per navigable surface, with URL
  nesting shared where a parent exists (the `tactics` / `tacticsEditor` pair at
  `destinations.ts:20` and `router/index.tsx:113` is the precedent; the editor is its own union
  member, not `tactics` plus a leaf flag). A `club` parent destination with a section leaf earns
  its keep only when a second club surface exists, and is then added the same way the editor was.
- **Where you enter from.** The league table rows become clickable this effort: a row already names
  a club, and the existing `intentOfClick` handler (`adapter.ts:125`) gives the keyboard/pointer
  split for free, with the row entering the focus path as a focusable action. Fixture and transfer
  rows stay unclickable for now — they are the same interaction with no added coverage, and each
  clickable surface is more focus/keyboard surface to review. Recorded as deferred in the map.
- **How you get back.** The shell already answers it: `navigateBack` (`g b`) is real router
  history, and landing on a rival's staff page mid-season on your own clock is exactly the lateral
  case history back handles. No new Back control and no chrome change. Ticket 04's "whose club"
  marker is what tells you, out loud, that you are not on your own club.
- **Registry, focus coordinator, keymap.** One new route `club/$clubId/staff` under `saveRoute`
  with `screenId="clubStaff"`. Everything a route needs is the fixed screen id, never the club id,
  so focus restoration and the focus coordinator work unchanged (`requestFocus({ screen:
  "clubStaff" })`); the title bar and chrome read the club name from the view, not from the route.
  The keymap changes nothing: `clubStaff` is a drill-down sub-surface, not a top-level screen, so
  it joins `CAREER_SCREEN_TYPES` nowhere and gets no `g` binding — the same rule `tacticsEditor`
  already follows. A `$clubId` that names no club in the save is the RPC's `ClubNotFoundError`,
  rendered by the screen — never a redirect (AC-12).
