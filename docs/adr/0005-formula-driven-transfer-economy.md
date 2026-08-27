# Transfer economy is formula-driven, not a negotiation state machine

Championship Manager's classic implementation drives wages and transfer fees through open-ended
negotiation: a hidden wage demand the player haggles against, and transfer offers that can go back and
forth indefinitely. We deliberately don't build that. Full-information Attributes (no scouting, no
fog-of-war — ADR-0001's Transfer Value is visible to every club identically) remove the premise
negotiation exists to solve: nobody is guessing at a hidden number, so haggling has nothing left to
surface.

Instead:

- **Wages** are pure formula output (Overall Rating, age, Potential-Ability-gap, same input shape as
  Transfer Value) — offered and accepted as-is, no negotiation UI. This is what makes AI-club wage
  decisions trivial: an AI club reads the same formula a human would.
- **Bids** are single-round with exactly one allowed counter-offer, not an open loop — caps both UI
  complexity and the state an AI bidder has to reason about.
- **AI target selection, bid amount, and accept/reject/counter thresholds** are all fixed multipliers
  of Transfer Value (bid at 1.0x, accept a counter up to 1.15x, accept incoming bids at 1.0x+, counter
  incoming bids between 0.85x-1.0x, reject below 0.85x) — deterministic and stateless with respect to
  squad need. An AI club never refuses to sell its only striker in v1; that's a follow-on concern, not
  this ticket's.
- **AI-club match Tactics** are assigned once per season by best-fit formation against the club's own
  Position Ratings (ADR-0003's Role Rating machinery), then held fixed — no reactive or mid-match
  tactical AI. Same motivation: deterministic and cheap over adaptive.

The cost is a flatter, more mechanical transfer market than CM03/04's — no player agents, no "would
consider a bid," no hidden-demand tension. That's an accepted v1 trade-off, not an oversight: it keeps
every AI-club decision (buy, sell, set wages, pick a Tactic) a pure function of public state, with no
negotiation state machine or squad-need model to build or test.
