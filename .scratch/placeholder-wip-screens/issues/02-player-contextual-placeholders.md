# Player contextual placeholders

Type: task
Status: resolved
Blocked by: 01

## Question

After Batch 1 establishes the routing patterns and placeholder conventions, create skeleton placeholder screens for the player contextual navigation tree. Each player entity should be reachable at `/career/$saveId/player/$playerId/...`.

Sub-screens from the CM 03/04 IA:
- Profile, Attributes, Positions, Contract, Transfer, History, Form, Injuries, Discipline, Training, Scout Report, Coach Report, Comparison, Media, Interaction

**Decisions this ticket resolves:**
1. Should each sub-screen be a separate route (individual placeholder per sub-screen)? Or should we have a single "Player Detail" placeholder with tab-like sections?
2. If individual routes, what path structure? `/career/$saveId/player/$playerId/profile`, `/career/$saveId/player/$playerId/attributes`, etc.?
3. What's the minimum skeleton for a player entity — does it need RPC to resolve the player name for the heading, or is a generic "Player WIP" sufficient?

## Answer

**8 player sub-screen routes created** (profile, attributes, contract, history, form, injuries, scout-report, coach-report) under `/career/$saveId/player/$playerId/...`, following the club segment pattern with `CareerPlayerChildView`. Each skeleton shows the player ID from the route param for identification. The player name RPC query is deferred to the real implementation — the skeleton renders without RPC dependencies. See [Agent Note](../../../.agents/notes/proposed/feature/2026-09-11-career-scoped-placeholder-screens.md).