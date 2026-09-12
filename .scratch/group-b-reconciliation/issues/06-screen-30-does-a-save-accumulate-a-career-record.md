# 06 — Screen 30: does a Save accumulate a career record?

Type: grilling

Blocked by: 03

Status: claimed

Status: resolved

## Answer

**A career record accumulates, partially, and Season Summary is the surface it belongs to.**

### What accumulates

- **Per-season league positions and Verdicts** — `board_objective` stores one row per Season with
  `season_number`, `final_position`, and `verdict`. Past seasons survive rollover.
- **Consecutive-Miss Counter and final outcome** — `manager_status` is a single-row table (scoped to
  the whole save) carrying `consecutive_misses`, `last_outcome` (none/warned/sacked), and
  `archived_cause` (sacked/retired/null).
- **Honours and match-count aggregates** — do not exist. No system computes total wins/draws/losses
  across seasons or honours won.

### Where it lives

Season Summary is the natural home. It already shows the most recent season's final position, Verdict,
consecutive misses, and archived cause. An "all seasons" view on Season Summary — listing past
seasons' positions, verdicts, and the terminal outcome — would serve the import's core "review
career milestones" goal without a new screen.

**Manager Profile is NOT the home.** The Group A Agent Note (`2026-08-30-manager-profile-screen.md`)
explicitly reserves Manager Profile for creation-time identity: "Manager Profile shows only profile
identity — the set-and-forget data chosen at creation." Board Objective, Verdict, Consecutive-Miss
Counter, and Manager Outcome "stay exclusive to Season Summary." Ticket 03 confirmed this boundary
by recording that Manager Profile holds nothing of a career record.

Navigation placement for a new surface (the map's fog) is unaffected: no new screen was warranted.
