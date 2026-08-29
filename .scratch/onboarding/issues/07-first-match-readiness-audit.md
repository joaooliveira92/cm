# Audit: what a brand-new save already has set

Type: task
Status: resolved

## Question

Fact-finding, AFK, no decision. The seed doc singles out **useful defaults** as one of 03/04's
genuine strengths: the player could reach the first match without redesigning training, replacing
staff, or mastering transfers. Whether a fresh save in this codebase satisfies that is currently
unverified, and several downstream tickets are guessing without it.

Create a save through the existing flow and establish, concretely:

- Does the human's club have a **tactic** set at creation, or is it null? `main/tactics.ts` notes
  that `season.ts` synthesizes a default for *AI* clubs "without one" — determine what the human's
  club gets, and what the Tactics screen shows on first open.
- Is there a **legal starting XI** selected, or must the player pick one before the first match can
  be played? What happens on `startMatch` if nothing is set?
- Is **Training Focus** defaulted per player? CONTEXT.md says it is "always set (defaults to
  none/balanced)" for a human-managed club — confirm that holds at save creation, not just after the
  first season boundary.
- Player **Condition** at save creation, and whether anyone starts injured or unavailable.
- Are **fixtures** generated and is the first fixture reachable from a fresh save without any player
  action?
- The **shortest possible path** from `createSave` to a completed first match: the exact sequence of
  clicks, and every point where the game refuses to proceed until something is configured.

Record the answer as findings — file/line references and observed behaviour, with a clear list of
"must configure before first match" versus "defaulted acceptably". Ticket 08 and the eventual spec
both depend on this being real rather than assumed.

## Partial answer already found (ticket 05)

While arguing ticket 05 I hit the first bullet's answer directly: **the human's club gets no Tactic at
save creation.** `apps/desktop/test/aiClubs.test.ts:53` asserts it as shipped behaviour, "every AI club
gets a valid, fixed Tactic at Season start; the user's club gets none," checking `strictEqual(tactic,
null)` with the comment "only ChangeTactics sets one."

This audit still owes the rest: what the Tactics screen renders against a null Tactic, what `startMatch`
does with no Tactic set, and whether that is the only unset-at-creation state or just the first one
found. With no inbox to announce any of it (ticket 05), everything this audit lists as unset is a
candidate for a persistent readiness affordance, which makes the "must configure before first match"
column the load-bearing half of the findings.

## Answer

Audited empirically: a save was created through `createSave` against a temp saves directory and its
SQLite file read back directly, then both match paths were driven. Every claim below is observed
behaviour from that run, not inference. Sample save: user club **Castlemere United** (`big` tier —
always `LEAGUE_CLUBS[0]`, since `worldGeneration.ts:14` sets `is_user_club = index === 0`).

### What a fresh save already has set

| State | At creation | Where |
|---|---|---|
| Clubs | 20, one flagged `is_user_club` | `worldGeneration.ts:11-16` |
| Squads | 25 players/club, fixed `SQUAD_COMPOSITION` (GK 3, DC 4, DL 2, DR 2, DM 2, MC 3, ML 2, MR 2, AMC 2, ST 3), ages 18–34 | `packages/shared/src/generation.ts:17-28` |
| Fixtures | 380, all 38 Matchdays, `played = 0` | `season.ts:128-134` |
| Season row | `season_number 1, current_matchday 0, phase 'pre_season'` | `season.ts:130` |
| Condition | **100 for all 500 players**, `last_injury_severity 'none'` | `season.ts:139-140` |
| Board Objective | one row, user club only, band from Stature Tier (`big` → 1–6) | `season.ts:149-150` |
| `manager_status` | one row, `sacked 0`, `consecutive_misses 0` | `season.ts:151` |
| Budgets | user club: transfer 8,000,000 / wage 20,000 | `transfers.ts` `initializeSeasonEconomy` |
| Contracts | 500 rows, `years_remaining` 1–3 | same |
| Bids | 0 rows | — |
| AI Tactics | **19 rows** in `tactics` — every club but the user's | `aiClubs.ts:126-140` |
| User Tactic | **none** — `tactics`/`tactic_slots` have no row for the user's club; `getTactics` returns `tactic: null` | `aiClubs.ts:134` skips the user club |
| Training Focus | **0 rows** in `training_focus`; every `SquadPlayerView.trainingFocus` reads `null` | `squad.ts` LEFT JOIN |

So the CONTEXT.md claim holds in the weak sense: Training Focus **is** always readable, defaulting to
no-focus, at save creation and not merely after a season boundary. A missing row and a `NULL` row are
equivalent by design (`schema.ts` `training_focus` comment).

### Nothing refuses to proceed. Ever.

**No code path anywhere blocks on unset state.** Concretely:

- `startMatch` with no user Tactic **succeeds**. `loadTeamSetup` (`match.ts:93-111`) falls back to
  `synthesizeDefaultTactic`, and the persisted `PersistedMatchStarted.homeSetup.tactic` in the sample
  run was a complete 4-4-2 with all 11 slots filled. The only errors `startMatch` can raise are
  `ClubNotFoundError` (unknown or self opponent) and the sacked guard.
- `advanceCalendar` from `pre_season / matchday 0` **resolves Matchday 1 immediately**, including the
  human's own Fixture, with no user Tactic set. Observed result:
  `{resolvedMatchday: 1, transferWindowClosed: "pre_season", phase: "in_season"}` and all 10 fixtures
  written with scores. The human's fixture went through `resolveFixtureScore` → `getTacticForClub`
  (`season.ts:199-207`), which falls back to `pickBestFormationTactic`.

**The "must configure before first match" column is empty.** Not because the defaults are good, but
because the two fallbacks make configuration unobservable.

### There are two fallbacks, not one, and they disagree

Ticket 06 requires "deleting the fallback that today hands the user's club a machine-picked Tactic."
There are **two independent ones, in different files, using different algorithms**, both reachable for
the same club in the same save:

- `match.ts:71-91` `synthesizeDefaultTactic` — hard-coded **4-4-2**, first player in squad order with
  a non-`unfamiliar` familiarity for each slot, falling back to "any unused player" and finally
  `squad[0]`. Used by the interactive Match day screen.
- `aiClubs.ts:87-114` `pickBestFormationTactic` — scans all five Formations, picks the one maximising
  outfield rating sum. Used by League fixture resolution, and by AI clubs legitimately.

Run against the same fresh user squad, `pickBestFormationTactic` chose **3-5-2** while the Match day
screen would have played **4-4-2**. Same club, same unset state, two different formations and two
different XIs depending on which button was pressed. Both must go; ticket 06's phrasing understates
the work, and `pickBestFormationTactic` cannot simply be deleted because AI clubs still need it — it
must lose only its use as a *fallback* in `getTacticForClub`.

### The Tactics screen cannot distinguish unset from set

`TacticsScreen.tsx:82` does `setTactic(loaded.tactic ?? defaultTacticFor("4-4-2"))`. Against a null
Tactic the screen renders a complete-looking 4-4-2 with every slot's Player select on `"Unassigned"`
and Role Rating `-`. There is **no empty state, no "you have not picked a team" message, and no visual
difference** from a saved tactic other than the blank selects. Saving requires the player to fill all
11 dropdowns by hand (each listing all 25 squad players by name only — no position, no rating, no
sorting); a partial save fails with the single generic string "Failed to save tactic — check every
slot has a unique player assigned", with no indication of which slot is wrong.

A legal XI is always *constructible* — `SQUAD_COMPOSITION` guarantees natural cover at all ten
Positions for every Formation — so the player is never stuck, only uninformed.

### Nobody starts injured or unavailable

Every player is at Condition 100 with `last_injury_severity 'none'`. More broadly, **there is no
availability concept in v1 at all**: `last_injury_severity` is read only by `recoverClubFitness`
(`season.ts:230`) to modulate recovery rate, never by squad selection, `validateTactic`, or
`loadTeamSetup`. An injured player is a slower-recovering player, not an unavailable one. No
"unavailable" state can be a readiness condition because none exists.

### Training Focus is unreachable

`setTrainingFocus` exists as an RPC (`packages/contracts/src/rpc.ts`) and as a command handler
(`training.ts`), and it is exercised by tests — but **no renderer file references `setTrainingFocus`,
`trainingFocus`, or `condition`**. `SquadScreen.tsx` renders name, age, positions, OVR and the visible
attributes only; it drops Condition and Training Focus even though `SquadPlayerView` carries both.
There is no Training screen. The system ticket 02 binds Technical Coaching to is shipped in the engine
and absent from the UI. Ticket 11 is raised for this.

### Shortest paths to a first match

Both take zero configuration, and neither is the loop the effort is designing.

1. **Exhibition (interactive).** New career → type a save name → Create → click the save name →
   `Match day` tab → opponent select (pre-populated with the first of 19 clubs alphabetically) →
   Kick off → watch ~350ms-paced commentary to Full Time. **Six clicks, nothing configured.** This
   match never touches the `fixtures` table, always seats the user at home, and its `"match"` event
   stream is read by nothing outside `match.ts` — `computeStandings` projects from `fixtures` only.
   The result is discarded.
2. **The real League Fixture (non-interactive).** New career → Create → click the save name →
   `League table` tab → **Advance Calendar** → Matchday 1 resolves headlessly, including the human's
   own match. **Five clicks**, no timeline, no score for the user's club in the return value — only
   `resolvedMatchday: 1`.

Ancillary legibility facts, in support of tickets 08/10: the Fixtures screen lists all 380 fixtures
flat with no highlight of the human's club and no "next fixture" affordance; the Continue control is
labelled **"Advance Calendar"** and lives inside `LeagueTableScreen.tsx` (both changed by ticket 06);
and `App.tsx` currently exposes **seven** tabs, including `match day` and `season summary`.

### Classification for the map's readiness-severity fog

Exactly one condition is unset-and-configurable at creation:

- **No Tactic / no starting XI — blocking before the human's Fixture resolves.** The only genuine
  member of "must configure". It is not blocking *today* only because of the two fallbacks; delete
  them, as ticket 06 requires, and it becomes the blocking condition ticket 06 anticipated. This
  audit catalogues the condition but does **not** fix where it is enforced: `advanceCalendar` has no
  pre-resolution seam today, so whether enforcement sits at an explicit match-entry boundary or in a
  preflight before headless resolution is ticket 10's call.
- **Training Focus (no focus) — informational, and not actionable until a UI exists.** A legitimate
  default; ticket 11 owns the reachability question.
- **Condition 100, no injuries — nothing to surface.** Not a readiness condition in a fresh save.
- **Squad depth — not a condition at all.** Generation guarantees cover at every Position; there is no
  case where the squad cannot field a legal XI, which confirms ticket 06's instruction not to invent a
  minimum-squad rule.

This collapses the "per-condition severity" question to a single condition, so no severity taxonomy is
needed: the readiness surface has exactly one thing to say in v1.
