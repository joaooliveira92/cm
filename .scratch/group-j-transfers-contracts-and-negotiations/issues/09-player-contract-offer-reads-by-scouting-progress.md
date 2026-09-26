# 09: The Player Contract Offer reads by Scouting Progress

Sliced 2026-09-23 from [Group I decision request 01](../../group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md).
Screen 137 was one of the note's named dependents; the shared rule it needs now exists (group-i
tickets 09/10). It was out of Group J's v1 scope only "until Group I's decision request 01" — the
"show other clubs' Players" part of the reason — and that question is answered.

**What to build:** offering a Player a Contract (a Free Agent, or a rival once a transfer is
agreed) shows his worth the way the market and Player screens do: the manager's own Players exact,
every other Player an **Attribute Range** by the human club's **Scouting Progress** on him, exact
only at **Fully Scouted**. The offer screen's wage, role and duration read the same knowledge as
the Player Profile behind it, so it never discloses an exact figure the relevant Player read
withholds. `signFreeAgent` gains the terms UI the inventory records as missing.

**Decisions:**

- Knowledge-limit the market, and every Player read outside the manager's club, on one shared read. A Player outside the manager's club shows Attribute Range values by Scouting Progress — Transfer Value and Overall Rating included — never an exact figure, until Fully Scouted. The manager's own Players are unaffected. The fix goes in the **read**, not the screens, so the market, BidComposer, Player Search (119) and Transfer Target Comparison (129) cannot disagree. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

> **Recorded 2026-09-26, before resolving — what the first criterion can and cannot mean.** It asks for
> agreement with "the Player Profile for the same Player", and no Free Agent's offer *can* be compared
> with a Profile: `getPlayerProfile` refuses Free Agents (`apps/desktop/src/main/career/player.ts`), and
> the offer serves Free Agents only, because there is no transfer-agreement state for a rival yet. The
> criterion's intent is the stronger claim — that the offer cannot disagree with the Profile — and that
> is what shipped and what is tested: the offer and the Profile resolve knowledge through the same
> `progressForReading` rule, and
> [`knowledge-agreement.test.ts`](../../../apps/desktop/test/main/transfers/knowledge-agreement.test.ts)
> now drives one Player across the Profile, the market, the offer, Player Search, the comparison, the
> club squad and the team scout report, asserting equal *values*, not merely equal shapes. The
> offer-versus-Profile pairing itself remains unreachable and is left for whoever adds the transfer
> agreement.

- [x] A Free Agent's Contract Offer reads his figures by Scouting Progress: ranged below Fully Scouted, exact at it, matching the Player Profile for the same Player
- [x] The offer response carries no exact figure for a Player below Fully Scouted (contract roundtrip, main test)
- [x] `signFreeAgent` takes role, duration and wage through a terms UI, and signing lands the player in the squad
- [x] `pnpm check:all` green, and e2e since the contract offer changes