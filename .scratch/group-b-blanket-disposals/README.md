# Group B blanket disposals

A prefactor for [group-b-reconciliation](../group-b-reconciliation/map.md). Three passes that apply
already-settled rulings across the whole Group B import, so that the six audit tickets on that map
open smaller files.

Nothing here is an audit finding. Every disposal below was decided before any Group B ticket opened —
two at charting (screens 29 and 32), the rest inherited from Group A — and is recorded in
[charting-spec.md](../group-b-reconciliation/charting-spec.md). These tickets apply those rulings;
they do not make new ones, with the single exception of the status vocabulary in ticket 01.

**The seam is the ledger**, [RECONCILIATION.md](../../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md).
All three tickets append rows to one Markdown table, which is why they run in a chain: the blocking
edges are write contention on a single file, not logical dependency. The three axes are independent
and could be reasoned about in any order.

**Run these before the audit tickets.** They strip roughly a third of the group's 261 sections, so
every audit that follows classifies less.

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Dispose screens 29 and 32 in full](issues/01-dispose-screens-29-and-32.md) | None |
| 02 | [Dispose the non-normative import scaffolding](issues/02-dispose-import-scaffolding.md) | 01 |
| 03 | [Dispose the multiplayer axis](issues/03-dispose-multiplayer-axis.md) | 02 |
