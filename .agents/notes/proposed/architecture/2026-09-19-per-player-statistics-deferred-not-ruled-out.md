# Agent Note: Per-player statistics are deferred, not ruled out

Status: proposed

## Problem

Two reconciliation ledgers disposed of the same missing model with opposite kinds, and in a ledger
those kinds mean opposite things.

Nothing in this codebase aggregates per-Player match output. Match statistics exist per match and are
never rolled up across a competition or a season. Four screens across three groups rest on that one
absent model:

| Screen | Group | Kind as first written |
|---|---|---|
| [54 Player Statistics](../../../../docs/specs/group_d_player_and_staff_records/54_player_statistics.md) | D | `out-of-scope` |
| [166 Competition Player Statistics](../../../../docs/specs/group_l_competitions_nations_and_world_information/166_competition_player_statistics.md) | L | `deferred` |
| 53 Player Form | D | `out-of-scope` — needs per-Player match *rating* history, a near neighbour |
| 224 Player Performance Dashboard | P | unreconciled; Group P has no effort |

`out-of-scope` means ruled permanently outside this game and is not revisited. `deferred` means wanted,
in scope, not built, and is. Group D and Group L cannot both be right about one model, and the
disagreement was invisible until both ledgers existed in `docs/specs/` — it surfaced during milestone
M1 step 1.

## Decision

**Deferred, unscheduled. Group P owns the model.**

Per-player statistics aggregation is not built and nothing currently plans it. It is **not** ruled out
of the game. Group D Screen 54's row moves from `out-of-scope` to `deferred`, aligning with Group L
Screen 166.

The reasoning is the same as [national teams are deferred, not ruled
out](../../implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md): the finding
behind both rows was *"no model exists"*, which is a statement about today, not a ruling about the
game. Absence of a model is grounds for `deferred`. `out-of-scope` needs a reason the thing should
never exist, and neither effort gave one — a football-management game that never tells you how many
goals a player scored is a strange thing to commit to permanently.

Group P (Statistics, Records and Analytics, 222–235) is the group that would build the store. When it
is charted, these rows are its dependents rather than its contradictions.

**Screen 53 Player Form stays `out-of-scope` for now.** It needs a per-Player match *rating* history,
which is a different model from output aggregation, and Group D ruled it out on its own terms. This
note does not reopen it — but whoever charters Group P should check whether the store it builds makes
53 cheap, in which case that row deserves the same treatment.

Approved by the human on 2026-09-19 ("approve your recommendations on the blocking decisions").

## Alternatives considered

**Align the other way: make Group L Screen 166 `out-of-scope` too.** Rejected. It would commit the
game to never showing per-player statistics, on the strength of two efforts that each only observed
the model was missing. It also contradicts Group P existing as a planned group at all — most of
Group P needs this store.

**Leave the disagreement and settle it when Group P is charted.** Rejected because an `out-of-scope`
row is not revisited by default. The ledger's own rules mean Group D's row would likely never be
re-read, and Group P would be charted against a ledger that says its foundation is permanently out of
scope.

## Consequences

- Group D's ledger moves Screen 54 into its deferred section, anchored `unscheduled` with Group P
  named.
- Group L's Screen 166 row is unchanged and now cites this note rather than an unresolved
  disagreement.
- Group P inherits a dependency rather than a contradiction: the store is the thing that unblocks
  Screens 54, 166, 167 and most of 222–235.
- **A pattern worth generalising.** Both corrections found by M1 step 1 so far — national teams and
  this one — are the same mistake: "we have not built the model" recorded as "the game will never have
  it". When reconciling a screen, absence of a model is `deferred` unless there is a stated reason the
  model should never exist.
