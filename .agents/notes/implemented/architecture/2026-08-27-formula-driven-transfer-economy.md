# Agent Note: The transfer economy is formula-driven, not a negotiation state machine

Status: implemented

> Migrated from ADR-0005 when the numbered ADR layer was retired.

## Problem

Championship Manager's classic implementation drives wages and transfer fees through open-ended
negotiation: a hidden wage demand the player haggles against, and transfer offers that go back and forth
indefinitely. Reproducing that means building a negotiation state machine and a squad-need model for
every AI club. Whether to build it had to be decided before any transfer command existed.

## Decision

No negotiation machinery. Full-information Attributes — no scouting, no fog-of-war, with Transfer Value
visible identically to every club — remove the premise negotiation exists to solve. Nobody is guessing
at a hidden number, so haggling has nothing left to surface.

- **Wages** are pure formula output, taking Overall Rating, age, and the Potential-Ability gap, the same
  input shape as Transfer Value. Offered and accepted as-is, with no negotiation UI. This is what makes
  AI-club wage decisions trivial: an AI club reads the same formula a human would.
- **Bids** are single-round with exactly one allowed counter-offer, not an open loop. This caps both UI
  complexity and the state an AI bidder must reason about.
- **AI target selection, bid amount, and accept/reject/counter thresholds** are fixed multipliers of
  Transfer Value: bid at 1.0×, accept a counter up to 1.15×, accept incoming bids at 1.0× and above,
  counter incoming bids between 0.85× and 1.0×, reject below 0.85×. Deterministic and stateless with
  respect to squad need. An AI club will not refuse to sell its only striker in v1; that is a follow-on
  concern.
- **AI-club match Tactics** are assigned once per season by best-fit formation against the club's own
  Position Ratings, using the Role Rating machinery from
  [Role Rating outside the match engine](2026-08-27-role-rating-outside-match-engine.md), then held
  fixed. No reactive or mid-match tactical AI. Same motivation: deterministic and cheap over adaptive.

## Alternatives considered

- **A full negotiation state machine with hidden wage demands**, as in the source games. Rejected:
  full-information Attributes remove the information asymmetry that makes haggling meaningful, so the
  machinery would add state and UI without adding tension.
- **Open-ended multi-round bidding.** Rejected in favour of one counter: unbounded rounds expand both
  the UI and the AI's reasoning state for little gain.
- **A squad-need model driving AI buy and sell decisions.** Rejected for v1: it makes every AI decision
  stateful and much harder to test, and was not needed to make the market function.

## Consequences

- Every AI-club decision — buy, sell, set wages, pick a Tactic — is a pure function of public state,
  with no negotiation state machine or squad-need model to build or test.
- The market is flatter and more mechanical than CM03/04's: no player agents, no "would consider a bid",
  no hidden-demand tension. This is an accepted v1 trade-off, not an oversight.
- Transfer Budget and Wage Budget are formula-driven outputs of Stature Tier, which is what lets
  [board objectives and manager sacking](../feature/2026-08-27-board-objectives-and-manager-sacking.md)
  treat Board Objective as an independent sibling output rather than a driver of budget.
