# 10: The Player screens show other clubs' Players by Scouting Progress

Sliced 2026-09-22 by the orchestrator from [decision request 01](../decision-request-01-knowledge-limited-player-reads.md).

**What to build:** opening another club's Player shows his Attributes, hidden Attributes (Potential
Ability, Injury Proneness), Overall Rating, Position Ratings and Transfer Value as **Attribute Ranges** by
the human club's **Scouting Progress** on him, exact only once **Fully Scouted**; his contract screen shows
no figure the market would withhold. The manager's own Players are unchanged. Today the Player read returns
every exact figure for any club's Player, so the Player screen discloses what the Scouting Knowledge screen
withholds. It reuses 09's shared rule and figure shape, so the market and the Player screens cannot
disagree about the same Player.

**Decisions:**

- **Knowledge-limit the market, and every Player read outside the manager's club, on one shared read.** *(Option A.)* See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** [09](09-the-market-reads-players-by-scouting-progress.md)

**Status:** resolved

- [x] Another club's unscouted Player shows every Attribute, hidden Attribute, rating and Transfer Value as a range; a Fully Scouted one shows exact figures identical to the market's
- [x] The manager's own Player shows exact figures
- [x] The Player response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [x] `pnpm check:all` green, and e2e since the Player screens change

## Answer

Shipped 2026-09-23 (`feat(player): player screens read by scouting progress`), which also resolved
ticket 09 against the tree, retargeted the e2e `saveEntry` harness to the rich save cards (`d6bc3d32`),
and filed the pre-existing suite reds it surfaced but did not cause (suite note below).

The knowledge limit now covers every Player read outside the manager's club, on the shared rule ticket
09 introduced:

- `main/career/player.ts` — `getPlayerProfile` resolves the human club once through `loadUserClub`
  (the same seam the market uses), looks up `scouting_progress` for any player outside the manager's
  squad, and routes every Attribute, hidden Attribute, Overall Rating and Transfer Value through the
  shared `figureByProgress` / `transferValueFigureByProgress`. Own-squad players skip the lookup and
  read exact. A player nobody has scouted reads at progress 0, the widest honest Range. A Goalkeeping
  Attribute absent from the row (an outfield player, CONTEXT.md) is omitted from the wire rather than
  ranged from a value that is not there.
- `contracts/src/schemas/players.ts` — `AttributeFiguresSchema` puts every profile figure through the
  same `PlayerFigureSchema` the market uses, so the two wires cannot disagree about one Player.
- `renderer/format.ts` — `formatFigure` / `formatFigureCredits` / `figureMid` moved up from
  `marketColumns.ts`; the Player screens, the header band and the market tables share one renderer, and
  the contract screen renders the worth the market withholds as the same bands.

Evidence per acceptance criterion, all observed on the tree 2026-09-23:

| # | Criterion | Proof |
|---|---|---|
| 1 | Rival ranged below Fully Scouted; exact at it, identical to the market | `test/main/career/player-profile.test.ts` — "a Fully Scouted rival reads the same exact figures the market publishes" and "an Unscouted rival reads every figure as a Range …", both asserted against the live market read; `e2e/player-screen-scouting.spec.ts` drives real navigation (League Table → scout report → key player) at progress 40 (ranged) and 100 (exact) |
| 2 | The manager's own Player reads exact | `player-profile.test.ts` "…read every own-club player…": every figure `_tag` `exact`, OVR equal to the squad read |
| 3 | No exact figure below Fully Scouted | `player-profile.test.ts` walk of the full 100%-JSON at progress 0 and 99 (no `"_tag":"exact"`; hidden `injuryProneness` ranged), plus `packages/contracts/test/player-profile-figures.test.ts`, which rejects a figure that is neither exact nor range, and a required outfield Attribute gone absent |
| 4 | `pnpm check:all` green; e2e since the Player screens change | `pnpm check:all` green 2026-09-23 (typecheck, oxlint, effect-lint, md-links, db-schema; 250 files / 2224 desktop tests). The e2e factor is the new `player-screen-scouting.spec.ts`, which passed; see the suite note for full-suite reality |

**Suite note — four pre-existing e2e reds, none touching the Player screens.** The full suite runs 55
passed / 4 failed, and every failure is red at the base tree for reasons that predate this ticket:
three assert the empty load-list copy with `getByText("No saves yet.", { exact: true })`, but the
rich-save-cards change (`d6bc3d32`) reworded the empty state into one paragraph
(`app/renderer/router/loadCareer.tsx`), so the exact-match element is gone; the fourth,
`e2e/journeys.spec.ts:295`, parses the market Value cell with `parseCr`, but since ticket 09
(`70aa419f`) an Unscouted rival's Value is a `low–high` band and the digits of both bounds concatenate
into an un-biddable amount. Filed as [desktop-suite-red 15](../../desktop-suite-red/issues/15-empty-load-list-specs-assert-retired-copy.md)
and [16](../../desktop-suite-red/issues/16-transfer-bid-spec-parses-the-ranged-market-value.md).
