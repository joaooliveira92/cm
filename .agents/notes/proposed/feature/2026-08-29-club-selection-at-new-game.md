# Agent Note: Club selection at new game

Status: proposed

## Problem

The human's club is not chosen; it is a positional accident. `generateWorld` iterates `LEAGUE_CLUBS`
and sets `is_user_club` on `index === 0`, so every save begins at Castlemere United, a `big`-tier
club. Club selection is meant to be the game's difficulty setting — the mechanism already exists,
because Stature Tier drives Transfer Budget, Wage Budget, and the Board Objective band — but the
player never touches it.

Making the choice real forces several decisions at once. Whether any club is gated. What the player
is shown in order to choose, given that this is the first substantial screen a new player meets and
information overload here is precisely the failure this effort exists to fix. Whether the difficulty
consequence is stated in words or left to be inferred. Whether the choice interacts with the Manager
Archetype from the pillars work. What a save is called, once a manager identity and a chosen club
both exist and `save_meta.name` is a third name for the same career. And mechanically, whether world
generation still runs before the choice or after it.

## Proposal

Club selection becomes a mandatory creation-time choice over all 20 generated clubs, presented after
the world exists, with the choice committed atomically as part of save creation.

**Availability.** All 20 clubs are freely selectable, with no reputation gate, Archetype gate,
unlock, experience requirement, recommended-club restriction, beginner-clubs-only mode, or random
shortlist. Club selection *is* the difficulty mechanism; gating it would remove the mechanism it is
supposed to provide, and reputation gating is independently ruled out of scope.

Creation cannot complete without a selection. The initial state is `selectedClubId = none` — no club
is silently preselected, specifically so that today's `index === 0` behaviour cannot survive as an
accidental UI default. A club may be *highlighted* for keyboard focus, but focus is not selection,
and the final review screen shows the chosen club before the career is created.

**Information design: compact list plus focused detail panel.** Every metric does not go into every
row. Each row answers three questions — who is this club, how large is it, what will be expected of
me — and carries club identity, Stature Tier, the Board Objective, and a derived challenge label.
The panel for the highlighted club adds Transfer Budget, wage-budget position, squad-quality
summary, squad depth, and a short prose challenge description.

Squad size is deliberately *not* a primary comparison metric. A raw total misleads: a squad of 28 can
lack positional depth while a smaller squad is balanced. It may appear as subordinate information;
squad *depth* is the player-facing summary that matters.

**Difficulty is stated explicitly, but never as a number.** The project keeps CM 03/04's
simulation-first structure, not its requirement that the player infer essential information
unaided. So the screen says what the club's situation is. What it does not do is collapse that into
a universal score like `Difficulty: 8/10`, because the dimensions genuinely diverge: an elite club
is easy financially and hard institutionally, a small club is the reverse. Three dimensions are
communicated separately — resources, squad, expectations — and a short challenge label (High
Pressure, Rebuild, Survival, Balanced Challenge, Title Contender) summarises without replacing them.

Challenge copy summarises actual mechanics and never dramatises hypothetical ones. "Win the league
or you will be sacked" is not writable: ADR-0006's ladder warns on the first `Missed` verdict and
sacks only on two consecutive, and a `big` club's band is positions 1–6, not first place. The
truthful form is "The board expects a top-six finish; falling short puts your position under
pressure." Symmetrically, no club may be described as offering job security unless the board model
provides it.

**Archetype and club stay orthogonal.** No required pairing, no bonus for a recommended pairing, no
penalty for a mismatch, no invalid combination, no "best archetype" badge, no warning that a legal
pairing is strategically wrong. A recommendation would push the player to optimise before they
understand any system, and would imply the other Archetypes are inferior, that the club was designed
around one Pillar, and that a wrong choice is punished — contradicting the established requirement
that every legal distribution produce a viable campaign.

Contextual, non-ranking explanation is permitted on the final review ("This club has a thin squad and
limited transfer funds; your Technical Coaching may support long-term development, while low Regimen
could make squad availability harder to sustain"). Any such copy is constrained to the five shipped
Pillar bindings — tactical effectiveness, club-to-club negotiation, Condition decay and recovery,
injury severity, Training Focus — and may not invoke dressing-room control, media handling, board
persuasion, loyalty, youth integration, or player-side contract negotiation, none of which exist.

**Save identity.** The career's primary identity becomes **Manager · Club · Season**. The free-text
save name survives, demoted to a secondary label: useful for several saves sharing a manager and
club, experimental branches, and challenge runs, but no longer the thing that identifies a career. It
is never defaulted to a generic value like "New Save 1", and the save-list row leads with the
generated identity, showing the custom label underneath when present.

*Optionality of that label is a product intent this note does not deliver.* `save_meta.name` is
`NOT NULL` today, so the accurate statement of the current state is: the free-text name remains
stored and required by the schema, and the save-list design treats it as a secondary label.
Making it genuinely optional requires a separate schema and compatibility decision, tracked as fog.
Until that lands, the field is not to be presented as optional, and an **empty string must not be
overloaded to simulate optionality** — that would satisfy the database constraint while quietly
weakening the domain invariant, leaving "has no label" and "has a label that is blank"
indistinguishable.

Storage responsibility splits accordingly: manager name stays on `manager_profile`, the chosen club
is authoritative career/world state, and the optional label stays save metadata. A save-list read
model may project all three, but the optional label is never the authoritative source of manager or
club identity.

**Generation order.** The complete league — all 20 clubs and their squads — is generated *before*
selection, and no club is marked as the user club during generation. The player then chooses among
generated clubs, and the choice is validated and committed atomically with save creation.

## Why the choice object is the generated club, not the club template

The player cannot make an informed choice against `LEAGUE_CLUBS`, because that array holds only a
name and a Stature Tier. Squad quality and depth are produced by `generateSquad(statureTier)` at
generation time and are not knowable before it runs. Choosing from templates would make the screen
either inaccurate or a promise that generation might not keep.

Positional identity disappears entirely. `is_user_club = index === 0` is deleted, and club ownership
must never depend on array order, insertion order, club-definition order, sorting, stature, or
display position. Selection is by stable `clubId`.

The conceptual model separates a neutral generated world from the human's relationship to it:
`GeneratedClub { clubId, ... }` carries no ownership, and `HumanCareer { managerProfile,
managedClubId }` holds it. The existing `clubs.is_user_club` column may remain as a persisted
projection of that relationship — `club.isUserClub = club.clubId === selectedClubId` — but it is
derived from the validated choice, never independently chosen or inferred.

## Where the displayed facts come from

Three of the panel's fields do not exist as rows at selection time under the current code, and each
resolves differently.

**Board Objective** is per-club-tier data that is only ever *persisted* for the human's club:
ADR-0006 fixes that AI clubs are never judged, and `startSeason` inserts exactly one
`board_objective` row. The screen therefore reads `BOARD_OBJECTIVE_BANDS[statureTier]` from the
shared package — the same constant `startSeason` itself uses, so it is authoritative rather than a
UI-local re-mapping, and ADR-0006's "only the player's club gets an objective" is preserved. The
band values are `big` 1–6, `mid` 7–14, `small` 15–20, which yields three distinct objectives across
20 clubs.

The distinction matters and must survive into implementation: the **displayed** objective is an
authoritative projection from shared policy — the objective that *would* be assigned if this club
were selected — while the **persisted** objective is a `board_objective` row created only for the
selected human club, by `startSeason`, after commitment. The screen is not pretending a row already
exists for all 20 clubs.

**Transfer Budget and wage commitment** come from `initializeSeasonEconomy`, which today runs inside
`startSeason`. Inspection shows it has **no dependency on the user club**: it loops all 20 clubs
writing `club_budgets` from `TRANSFER_BUDGET_BY_TIER` / `WAGE_BUDGET_BY_TIER`, then writes one
`contracts` row per generated player with a wage from the pure `weeklyWage(overall, age, potential)`.
It is therefore lifted out of `startSeason` and run immediately after world generation, before
selection, so the screen displays persisted rows rather than recomputed estimates. What genuinely
depends on the choice — the `board_objective` row, `manager_status`, and AI Tactic assignment — stays
in `startSeason`, which runs after the club is committed.

**Squad quality and depth** are derived at display time from the generated squads via the existing
`overallRating`, never hardcoded onto a club definition, because generation is unseeded and two saves
of the same club can differ materially. The threshold bands that turn ratings into labels like "Title
contender" are not fixed here.

**Last-season league position is not shown.** `startSeason` runs once, creating Season 1; there is no
prior season anywhere in the schema. Displaying a fabricated finish would create fictional precision
and raise questions nothing can answer: did it influence the Board Objective, are there matching
results, how are promoted and relegated clubs represented, can the player inspect the prior table.
Stature, current squad quality, budget, and objective describe the challenge more honestly. This is
permitted only if authoritative previous-season state later exists.

## Creation transaction and the cancelled-selection hazard

Generating before choosing means a generated world exists while the player is still deciding, and
`createSave` currently writes straight into `savesDir/<id>.sqlite`. A cancelled selection must not
leave that file behind as a playable save.

The completed save must satisfy: exactly one `manager_profile` row; exactly one selected
`managedClubId`; exactly one generated club matching it; and exactly one user-club projection if that
projection is retained. Manager profile, selected club, generated world, and save metadata are
committed together.

The governing invariant is: **a save is discoverable only after its creation configuration has been
validated and committed.** The `save_meta` insert therefore moves to the commit step rather than
running first, which makes discoverability a consequence of commitment rather than of timing.

The lifecycle becomes: create provisional save storage; generate neutral world state; initialize the
economy for all clubs; present the generated clubs; collect and validate the selection; write manager
and selected-club state; write `save_meta` as part of final commitment; and only then is the save
visible to `listSaves`.

Cancellation still performs **deterministic cleanup** — deleting the provisional file is the primary
mechanism, not an optimisation. That `listSaves` maps `readSaveSummary` through `Effect.option` and
drops anything failing to decode, so a file without `save_meta` cannot appear in the list, is a
*secondary safeguard* covering process death mid-flow. It must not be relied on as the successful-
cancellation path, because doing so would leave orphan databases accumulating silently as normal
behaviour rather than as an exceptional case.

This reverses the ordering described in the manager-pillars note, which recorded `createSave` as
inserting `save_meta` first and then generating. That note's substantive conclusions are unaffected:
the `manager_profile` table decision, its single-row constraint, Pillar validation, `archetype_origin`,
the absence of a `ManagerCreated` event, and the choice not to model a Manager Decider all stand.

## Save-list row and what backs it

The primary line is Manager · Club. The secondary line carries season and progress. Of the fields a
richer row would want, `season.season_number`, `season.phase`, and `season.current_matchday` exist;
`save_meta.created_at` exists; a *last-played* timestamp does not, and there is no season year label
— `season_number` is an integer, so v1 renders "Season 1", not "2026/27". Anything beyond those
requires new persisted fields and is not settled here.

`save_meta.name` is currently `NOT NULL`; making the label optional requires it to accept empty or
null.

## What this note must not constrain

AI manager assignment and AI Archetypes are **not required** by this ticket. Their behaviour,
ownership, and relationship to onboarding remain *Not yet specified* at the map level. This work must
neither implement them nor introduce defaults that constrain their future design — in particular, no
placeholder Pillar Distribution may be attached to AI clubs in the course of removing
`is_user_club = index === 0`, since a default assigned in passing would settle by accident a question
the map has deliberately left open.

## Alternatives considered

- **Keep generation inside `createSave`, after selection, and show only static per-tier data.**
  Cheaper, and it avoids the provisional-save hazard entirely. Rejected because it makes club choice
  nearly meaningless: budgets and the objective band are pure functions of Stature Tier, so the four
  `big` clubs would be mechanically identical to each other, as would the eight `mid` and eight
  `small`, leaving 20 clubs presenting three distinct situations. Only generated squad data
  distinguishes clubs within a tier. The hazard is real but bounded, and `listSaves` already tolerates
  undecodable files.
- **Recomputing budgets and wage commitment in the UI from shared pure functions instead of moving
  `initializeSeasonEconomy`.** Would work — `weeklyWage` is pure and the budget tables are shared
  constants, so the numbers would match what `startSeason` later persists. Rejected because it
  duplicates derivation logic across the boundary for no gain once it is established that the
  economy step has no user-club dependency and can simply run earlier.
- **A single numeric difficulty rating.** Rejected: it collapses resource scarcity, squad quality,
  board pressure, wage flexibility, transfer flexibility, short-term risk, and rebuilding scope into
  one number that is wrong for both ends of the range.
- **Leaving difficulty fully implicit, as CM 03/04 did.** Rejected: the effort explicitly keeps 03/04's
  simulation-first spine while rejecting its "explained too little" failure, and this is the sharpest
  place that tension lands.
- **Recommended Archetype-club pairings, or a warning on a poor pairing.** Rejected: no Pillar
  binding varies by Stature Tier, so any recommendation would assert a relationship the simulation
  does not implement, and a warning would teach a rule that is not real.
- **Dropping the free-text save name entirely.** Considered on the grounds that it is a third name
  for the same career, typed before the player knows what they are naming. Rejected because it makes
  multiple saves of the same manager and club indistinguishable; demoting it to an optional label
  removes the onboarding friction without losing that.
- **Persisting a `board_objective` row for all 20 clubs so the screen reads rows uniformly.**
  Rejected: it contradicts ADR-0006's rule that only the player's club is ever assigned an objective
  and judged against it, to avoid re-reading one shared constant.
- **Showing squad size as a headline comparison metric.** Rejected as misleading without positional
  breakdown.

## Acceptance criteria

- All 20 generated clubs are selectable; none is gated by reputation, Archetype, progression, or
  prior play.
- No club is selected by default; creation cannot complete with `selectedClubId = none`; keyboard
  focus does not constitute selection.
- `is_user_club = index === 0` is gone, and no code path derives club ownership from any
  collection-order or display-order assumption.
- The selection screen operates on generated club data, and the player selects a stable `clubId`.
- Every club row shows club identity, Stature Tier, Board Objective, and a derived challenge label.
- The detail panel shows Transfer Budget, wage-budget position, squad quality, squad depth, and
  explicit expectation context.
- Challenge communication is explicit and descriptive, with no universal numeric difficulty score,
  and asserts no consequence the board model does not implement.
- Last-season position is absent.
- Club choice and Archetype are mechanically independent; the UI names no optimal Archetype for a
  club and warns against no legal pairing; any Archetype-club copy refers only to the five shipped
  Pillar bindings.
- The save list leads with Manager · Club · Season, with the custom label secondary when present;
  the season segment reads "Season 1", never a calendar-year label.
- The free-text name is still stored and still required by the schema, and is not presented as
  optional; no code path writes an empty string to stand in for "no label".
- No "last played" value is shown or sorted on.
- Save creation validates that the selected `clubId` belongs to the generated league.
- The completed save identifies exactly one human-managed club, and manager profile, selected club,
  generated world, and save metadata commit atomically.
- Cancelling selection leaves no playable save.

## Risks

- **A provisional generated world exists on disk before commit.** Generating first is what makes the
  choice informed, but it creates a window in which a database file exists for a career the player
  may abandon. Deferring the `save_meta` insert makes such a file invisible to `listSaves` rather
  than merely unlikely, but that is a safeguard rather than the cleanup path; if deterministic
  deletion fails, orphan files accumulate invisibly, and a sweep of `.sqlite` files lacking
  `save_meta` may be needed.
- **Moving `initializeSeasonEconomy` out of `startSeason` splits a step its doc comment describes as
  running "in the same transaction as world/season generation".** The split is safe only because it
  has no user-club dependency; anything later added to it that reads the user's club would silently
  break, so the constraint needs stating at the call site.
- **Squad-quality labels are asserted before their thresholds exist.** Committing to "Title
  contender" / "Lower-table" phrasing ahead of the banding rule risks labels that do not match what
  generation actually produces, particularly at tier boundaries where a lucky `mid` squad may outrank
  an unlucky `big` one.
- **Three Board Objective bands across 20 clubs limits how much the row can differentiate.** Within a
  tier, the objective and both budgets are identical, so the challenge label and squad summary carry
  the entire burden of distinguishing eight `mid` clubs from one another.
- **The final review's contextual Archetype copy sits close to the line it must not cross.** Prose
  describing how a Pillar interacts with a club's circumstances can be read as a recommendation even
  when it ranks nothing; the constraint holds only as long as the copy is written against shipped
  bindings and never comparative.
- **`save_meta.name` is `NOT NULL` today**, so making the label optional is a schema change on the
  table every save file already carries.
