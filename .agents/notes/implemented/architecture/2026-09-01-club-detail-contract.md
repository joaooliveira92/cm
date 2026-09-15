# Agent Note: The club detail panel is a compact squad readout over one payload

Status: implemented

## Problem

`ClubSelectionRow` carries exactly six values — `clubName`, `statureTier`, `boardObjectiveMin`,
`boardObjectiveMax`, `squadQualityBand`, `transferBudget`, `wageBudget` — and today's cards render
all of them. Ticket 01 moved board objective, transfer budget and wage budget to **panel-only**, but
left the panel's content open: what the detail panel shows once a club is chosen, and how that data
reaches the renderer. A detail panel built on the existing contract alone is the current card
relocated to the right — no new information, and no reason for the split into rail and panel.

Two resources are known to exist but unused:

- **The generated squad.** `main/clubSelection.ts` already calls `loadSquadPlayers(club.id)` for
  every club to compute Squad Quality, then discards everything but the band. The loaded
  `SquadPlayerView`s carry `overallRating`, `age`, `positions`, and `positionRatings`, so any
  squad-derived figure the panel wants costs nothing extra to compute, only to transfer.
- **The board objective is already a position band.** It is read from the shared
  `BOARD_OBJECTIVE_BANDS` constant (big 1–6, mid 7–14, small 15–20) — the same constant
  `startSeason` uses — so "expectation" can be stated as prose, not rendered as a raw `min – max`
  pair.

Facilities are confirmed absent from the schema (`clubs` is
`(id, name, stature_tier, is_user_club, generation_seed)`), so no facilities readout is possible.

The money rendering is an outlier. This screen formats `` `$${...toFixed(0)}` `` inline
(`ClubSelectionScreen.tsx:49-50`) and prints transfer and wage budgets adjacent with no labels;
CONTEXT.md defines **Credits** as the single currency unit, and TransfersScreen already formats
credits as `amount.toLocaleString()` + `" Cr"` (`TransfersScreen.tsx:74`). The `$` is a leftover,
and there is no shared formatter anywhere in the renderer.

## Decision

### The panel shows a compact squad readout, not a relocated card

Once a club is chosen, the panel carries three groups, in the shape the existing
[Club selection at new game](../../proposed/feature/2026-08-29-club-selection-at-new-game.md) note
already fixed (budgets + explicit expectation context) plus a squad readout:

- **Expectation context.** The Board Objective restated as prose against the league's size — a `big`
  club reads "The board expects a top-six finish", a `mid` "between 7th and 14th", a `small` "15th or
  below" — never the raw `min – max` pair. The values come from the shared
  `BOARD_OBJECTIVE_BANDS[statureTier]` constant, authoritative rather than UI-local.
- **The two budgets, labeled and distinct.** **Transfer Budget** is the spend-down pool;
  **Wage Budget** is the running cap. Both render as **Credits** and each gets its own labeled row —
  they stop being adjacent anonymous numbers.
- **A compact squad readout**, derived from the generated squad, because it is the one fact specialized
  to this club (budgets and the objective band are pure functions of Stature Tier). It shows squad
  size and average age as **subordinate information**, never as headline comparison numbers, and a
  top-few readout — the five players with the highest `overallRating`, by name and their strongest
  Position. Squad *size* stays subordinate because the existing note already rejected a raw total as
  a comparison metric: it misleads without positional breakdown, and positional composition is
  constant by construction, so depth differentiates nothing.

No facilities, no last-season league position (there is no prior season in the schema). No raw
`SquadPlayerView`s cross the boundary — only the precomputed figures and the top-five names/ratings,
so the payload stays compact rather than shipping 25 player objects per club.

### One payload, not two

`ClubSelectionView` widens so the read-only query already carries the panel's data. `getClubSelection`
computes the squad readout server-side from the squads it is already loading, and each row ships its
detail in the same response. There is **no second per-club RPC** fired on selection. Twenty fixed
clubs with squads already in hand means the only cost of this route is transfer, not computation; the
panel fills the instant a row is focused with no loading state, and a secondary fetch has no
same-screen precedent worth copying here. Revisit the split when the selectable set grows with
multi-league generation — introduce a per-club RPC then, not now.

### A shared `formatCredits`

The renderer gains one shared `formatCredits` helper matching TransfersScreen's convention
(`toLocaleString()` + `" Cr"`), and the panel uses it. This screen adopts it; TransfersScreen's local
copy stays until that screen is touched — promoting it there is out of this map's scope. The `$` +
`toFixed(0)` inline formatter is gone with the card.

## Alternatives considered

- **Panel is today's card relocated** — the six existing values, rephrased, nothing from the squad.
  Rejected: it gives a manager no reason to look at the panel beyond relocating yesterday's screen,
  and it throws away the squad data the read already paid to load. The split is only justified if the
  panel is deeper than the row it replaces.
- **A second per-club RPC fired on selection.** Rejected: twenty clubs, squads already loaded in the
  exact handler, and the panel must fill the moment a row is focused — a per-selection fetch would
  flash a loading state on every focus move. Its one virtue, scaling when the league count grows, is
  the trigger for introducing it, not a reason to build it now.
- **Ship the top-few readout only, skipping size and age.** Rejected as the leanest defensible
  option but not the best: size and age are already computed, fill the panel honestly, and cost
  nothing.
- **Squad size or a top-player list as headline comparison metrics.** Rejected for squad size: the
  existing note already fixed that a raw total misleads and depth is constant by construction. Both
  stay subordinate; the rail's comparative weight stays on the squad-quality meter.
- **Keep formatting local to this screen, just adding labels.** Rejected: the `$` formatter is a
  display-convention outlier twice over — wrong currency symbol, unlabeled adjacent values — and a
  formatter that recurs across screens earns a shared home, the same reasoning ticket 01 applied to
  the workspace chrome.
- **Restate the board objective as clusters of prose** ("win the league or be sacked") instead of
  the truthful band phrasing. Rejected: the sacking ladder warns on the first `Missed` verdict and
  sacks only on two consecutive, so the truthful form is the band statement, and the 
  `club-selection-at-new-game` note already fixed this copy constraint.

## Consequences

What shipped:

- `getClubSelection` returns, per club, the existing row fields plus a compact detail block:
  expectation context, Transfer Budget and Wage Budget, squad size, average age, and the top five
  players by `overallRating` with name and Position — computed from the generated squad at query
  time, never hardcoded onto a club definition.
- The expectation prose derives from the shared `BOARD_OBJECTIVE_BANDS` constant, not from a
  UI-local band table: `getClubSelection` reads the band from the constant onto the row, and the
  renderer only phrases the numbers it is given — including against the league's own size, so the
  copy cannot drift from a 20-club assumption.
- The panel shows budgets as two labeled rows rendered through the shared `formatCredits`, and no
  `$`/`toFixed(0)` inline formatting remains.
- Selecting a club renders the panel from the already-fetched payload with no additional RPC and no
  loading state for the detail block.
- Squad size and average age appear as subordinate detail within the panel and not as headline
  figures on the rail.
- No facilities and no prior-season values appear in the panel.

What it costs:

- **The panel's data is "as of first load".** The read-only query is a fixed snapshot of the
  provisional world at selection time; it is not a projection that tracks later world changes. That
  is correct here — selection happens once, against a world that cannot change until `commitCareer` —
  but the detail payload must not be mistaken for a live read model when a squad-changing system (a
  transfer, a simulation) later exists.
- **`ClubSelectionView` grows with the set of clubs.** The one-payload choice is a bet that the
  league count stays small enough that shipping all details up front costs less than a second fetch.
  If multi-league generation makes the set large, the switch to a per-club RPC (or to a
  detail-on-demand read) becomes the fix; recording that trigger here is the point.
- **Promoting `formatCredits` creates a second (shared) source of the same formatting.** For the
  moment TransfersScreen keeps its local copy, so the convention lives in two places until that
  screen is touched; the shared helper is the canonical reading, and the next touch should delete
  the local one.

## Related

- Ticket: `.scratch/club-selection/issues/03-club-detail-contract.md`
- The panel's field philosophy and copy constraints this refines — budgets, expectation context, the
  size-as-subordinate rule, last-season-position absence, generation-order mechanics:
  [Club selection at new game](../../proposed/feature/2026-08-29-club-selection-at-new-game.md) (partially
  superseded, alongside, by [Squad Quality summary bands](../feature/2026-08-29-squad-quality-summary-bands.md)).
- The row-vs-panel split this fills in, and the no-auto-selection call:
  [The Club Selection two-column workspace](2026-09-01-club-selection-workspace-shape.md)
- The selection record this panel hangs off:
  [The club selection is bound to the world it was picked from](2026-09-01-club-selection-bound-to-its-world.md)
- Fleet flagging of the leftover `$`: the token-adoption note names `ClubSelectionScreen` as the
  light-theme/off-alias outlier: `../../proposed/architecture/2026-08-31-token-adoption-and-migration.md`