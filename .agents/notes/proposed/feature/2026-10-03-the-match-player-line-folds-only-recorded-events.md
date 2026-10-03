# Agent Note: The match player line folds only recorded events

Status: proposed

Partially supersedes [the match model shows only what it produces](../../implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md):
that note's rule stands unchanged; its factual premise ("no set-piece event, and no foul or offside
event", "no event names a save, a tackle or an assist") is no longer true of the engine, and this note
records what the rule yields against the engine as it is now. Corners and the possession bar are
covered in [the possession bar shows attack share](2026-10-03-the-possession-bar-shows-attack-share.md).
Both stay active; neither is archived by the other.

## Problem

The CM 03/04 per-player match table (the *Club Stats* tab, also reused by the player *Form* tab) has
twenty columns: No., card, Inf., Pas, Cmp, Key, Tck, Won, Hea, Won, Key (headers), Int, Run, Off, Fou,
Fld, Ast, She, Sat, Con, Rat, Gls. The game's Match Event stream now carries more than when the
statistics rule was set: `Foul` names the fouling defender, `Offside` the flagged attacker, `KeyPass`
the chance creator, every `Goal`/`ShotOnTarget`/`ShotMissed` names a creator in `assistPlayerId` and
the goalkeeper in `keeperId`, and `Corner`/`FreeKick`/`Penalty` name the taker. There is still no pass,
tackle, header or interception event, and `Foul` does not name the player fouled. The table needs a
fixed column set that a fold over the stream can fill honestly.

## Proposal

A pure function in `packages/shared/src/rules/` (beside `matchRating.ts`) will fold a timeline, cut
at a revealed-event count or uncut, into one **Match Player Line** per player who was in the matchday
squad. The live per-player table, the post-match table and the stored line behind the Form tab
([player match lines are written at resolution](../architecture/2026-10-03-player-match-lines-are-written-at-resolution.md))
will all call it, so the three can never disagree.

### Columns and their source

| Column | Source | Counting rule |
|---|---|---|
| No. | Squad number at kickoff | Not a fold; read from the matchday squad. |
| C. | `YellowCard`, `RedCard` | A red card glyph wins over a yellow; text alternative "Booked" / "Sent off". |
| Inf. | `Substitution` | `off 53` when the player went off, `on 53` when he came on, both when both happened; a goalkeeper stand-in move is not a substitution and writes nothing. |
| Key | `KeyPass` | Counted for the creator, except when the creator is the finisher of the chance event the `KeyPass` follows: a self-created chance is not a key pass. |
| Off | `Offside` | For the flagged player. |
| Fou | `Foul` | For the fouling player. |
| Ast | `Goal.assistPlayerId` | Only on a `Goal`, and only when the assister differs from the scorer. A creator on a saved or missed shot is a key pass, not an assist. |
| She | `Goal`, `ShotOnTarget`, `ShotMissed` | All three, for the shooter. Penalties count: their outcome is one of these three events. |
| Sat | `Goal`, `ShotOnTarget` | For the shooter. |
| Sav | `ShotOnTarget.keeperId` | For the goalkeeper named. Shown only when at least one goalkeeper row has a value, so outfield-only views don't carry an empty column. Timelines stored before `keeperId` existed yield no saves, which is the honest reading of an old record. |
| Con | Match Condition at the cut | Live: the engine's per-player Condition at the revealed position. Post-match: Condition at full time. Not stored in the Form line. |
| Rat | Match Rating | [The rating reads recorded involvement](2026-10-03-the-match-rating-reads-recorded-involvement.md). |
| Gls | `Goal` | For the scorer. |

Rows are the matchday squad: starters in slot order, then the named bench in bench order. A bench
player who never came on is listed with every column empty and dimmed, never zero-filled: they did not
play, so zero would claim something. The captain carries `(c)`.

### Absent columns

Pas, Cmp, Tck, Won (tackles), Hea, Won (headers), Key (headers), Int, Run and Fld are **not drawn**.
Unlike the four team statistics that screen 95 names as unavailable, a missing per-player column is
not listed as unavailable either: eight columns of "not tracked" in a dense table is noise, and the
screen states the rule once in its caption ("Only what the match records is shown."). `Run` is left
out although a `RunWithBall` event exists, because it names the chance's finisher and creator, not a
player who ran with the ball; counting it would re-label a chance type as a per-player action.

## Alternatives considered

**Show all twenty columns with the unbacked ones as `-`.** Rejected: CM's `-` means "not applicable"
(a rate with no attempts), so the same glyph would mean two things, and a column of dashes for every
player still occupies the eye.

**Estimate passes and tackles from attribute ratings.** Rejected by the standing rule: a figure with no
event behind it is indistinguishable on screen from a recorded one.

**Count the creator of every chance as an assist (CM 03/04 is loose here).** Rejected: an assist is
part of a goal in every reading the player brings to the screen, and the separate Key column already
credits chance creation.

**Name the fouled player by extending `Foul`.** Deferred, not rejected: it is an engine change that
alters what a seed produces, safe for committed matches since timelines are stored, and belongs to the
engine effort listed under this map's Out of scope.

## Acceptance criteria

- One pure fold produces the line; live, post-match and stored-line reads call it, and a test proves
  the three agree for one seeded match.
- A test per counting rule above: self-created chance yields no Key, a creator on a saved shot yields
  Key but no Ast, a penalty goal yields She, Sat and Gls, a goalkeeper stand-in writes no Inf. note.
- An unused substitute's row renders empty and dimmed, never `0`.
- No Pas/Cmp/Tck/Hea/Int/Run/Fld column exists in the table, and the caption states the rule.

## Risks

- The table looks thinner than CM's. Accepted: this is the honest table for the model, and it widens
  without a rewrite when the engine records more, because columns are a list keyed by event kind.
- `Sav` depends on `keeperId`, which is commentary-oriented in its doc comment ("Read only by
  commentary"). That comment becomes false and is updated in the implementing change.
