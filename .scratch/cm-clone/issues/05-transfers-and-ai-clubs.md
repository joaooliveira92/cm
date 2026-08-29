# Transfer & contract mechanics, AI-club behavior

Type: grilling

Status: resolved

Blocked by: 01

## Question

Lock v1 transfer/contract mechanics in detail: how player value is derived from attributes (from
ticket 01) for listing/bidding purposes, budget rules (per-club, per-season, who sets them), contract
terms (wage, length, renewal), and how AI-controlled clubs decide who to bid for, how much to offer,
and when to accept a bid on their own players — since full-information attributes mean every club
"sees" the same data you do. Also decide how AI clubs pick their own tactics (formation/roles) for
matches, since that consumes ticket 03's vocabulary.

## Answer

Resolved via a grilling + domain-modeling session. Canonical vocabulary recorded in
[CONTEXT.md](../../../CONTEXT.md) under "Transfers & contracts"; architecture rationale in
[ADR-0005](../../../docs/adr/0005-formula-driven-transfer-economy.md).

**Currency**: a single fictional unit, Credits — no real-world currency tie, consistent with the
fully fictional world.

**Contracts**: length 1–5 years, set identically at signing or renewal; wage is pure formula output
(Overall Rating, age, Potential-Ability-gap — same input shape as Transfer Value), no negotiation UI.
On expiry (start of the following Season) the player becomes a Free Agent, signable by any club for
Credits 0 via the normal signing flow, no Bid/negotiation step. Renewal is the same signing flow run
against the player's current club, any time during an open Transfer Window.

**Budgets**: each club gets a Transfer Budget (a per-Season Credits pool, spend-down — pre-season
window spend reduces what's left for the mid-season window, no replenishment between them) and a Wage
Budget (a running cap on the sum of active Contracts' wages, not a spend-down pool). Both derive from a
fixed per-club stature tier baked into generated club data at Season start — not board-set. Flagged as
a hook: ticket 06 (board objectives) may later let board objectives adjust the per-season baseline;
this ticket doesn't assume that mechanic.

**Listing/bidding**: any player can receive a Bid at any time during an open Transfer Window, listed or
not (matches CM03/04's unsolicited-bid behavior). Listed is a cosmetic flag only, doesn't gate bid
legality. A Bid is single-round: the selling club accepts, rejects, or makes exactly one counter-offer,
which the bidder then accepts or withdraws from.

**AI-club buying**: at each window's open, an AI club checks each of its Positions for a squad gap
(best Position Rating at that slot below a fixed threshold relative to the League average for that
slot); for each gap it targets the highest-Transfer-Value affordable player (Natural/Competent at that
Position, within remaining Transfer Budget *and* Wage Budget headroom for the formula wage) and bids
Transfer Value exactly. If countered, accepts up to 1.15x Transfer Value if still affordable, otherwise
withdraws. One target per weak slot per window — no speculative bidding.

**AI-club selling**: accepts any incoming bid ≥ 1.0x Transfer Value outright; counters bids between
0.85x–1.0x up to exactly Transfer Value; rejects outright below 0.85x. No squad-need veto in v1 — an AI
club will sell its only striker if the price clears the threshold; squad-need modeling is a future
concern, not this ticket's.

**AI-club tactics**: each AI club is assigned one fixed Tactic at Season start — formation chosen by
best-fit against the squad's Position Ratings (the formation maximizing summed best-XI Position Rating
across its 10 outfield slots), roles defaulted to each slot's designated v1 Role, instructions fixed at
balanced/normal/medium. Never changes mid-season or reacts to the opponent or in-match state in v1.

