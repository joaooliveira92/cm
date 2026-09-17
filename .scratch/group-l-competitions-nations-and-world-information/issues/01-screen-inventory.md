# 01: Screen inventory — which of screens 161–180 already exist in the codebase

## Question

Which screens 161–180 (Competition Overview through World Football Overview) already have a route,
component, or data model in the codebase, and which are entirely absent?

The imported spec at `docs/specs/group_l_competitions_nations_and_world_information/` contains 20
screen specifications. The codebase already implements League Tables, Fixtures, Cup Ties, and basic
Competition views. This ticket classifies each screen as:

- **Exists** — a route and component already ship that match the screen's purpose
- **Partial** — some data or view exists but is incomplete relative to the spec
- **Absent** — no route, component, or data model exists

For each `Partial` or `Absent` screen, note the gap. This inventory is the foundation for the
reconciliation ledger and subsequent spec/slice tickets.

**Type:** task

**Blocked by:** None

## Answer

All 18 screens are absent for practical purposes. 11 have routes + 15-line WIP `<h1>` stubs but
zero real content; 7 have no route at all. **The binding constraint is the data layer**: no model,
RPC schema, or simulation code exists in `packages/shared`, `packages/contracts`, or
`packages/game-engine` for competition data beyond basic fixtures. Full findings at
`docs/research/group-l-screen-implementation-audit.md`.

Screens 176–178 (National Team) are especially deep: the codebase has no national team concept,
international fixtures, or squad management at any layer.

Detailed classification:

| Screen | Name | Status | Notes |
|--------|------|--------|-------|
| 161 | Competition Overview | Partial | Route + WIP stub, no data |
| 162 | Competition Table | Partial | Route + WIP stub, no data |
| 163 | Competition Fixtures | Partial | Route + WIP stub, no data |
| 164 | Competition Results | Partial | Route + WIP stub, no data |
| 165 | Competition Statistics | Partial | Route + WIP stub, no data |
| 166 | Competition Player Statistics | Partial | Route + WIP stub, no data |
| 167 | Competition Team Statistics | Partial | Route + WIP stub, no data |
| 168 | Competition Rules | Partial | Route + WIP stub, no data |
| 169 | Competition Stages & Qualification | Partial | Route + WIP stub, no data |
| 170 | Competition Draw | Absent | No route, no component |
| 171 | Competition Awards | Absent | No route, no component |
| 172 | Competition History | Absent | No route, no component |
| 173 | Competition Records | Partial | Route exists (past-winners), no data |
| 174 | Nation Overview | Partial | Route + WIP stub, no data |
| 175 | Nation Competitions | Partial | Route + WIP stub, no data |
| 176 | National Team Overview | Absent | No route, no component |
| 177 | National Team Squad | Absent | No route, no component |
| 178 | International Fixtures & Results | Partial | Route + WIP stub, no data |
| 179 | World Rankings | Absent | No route, no component |
| 180 | World Football Overview | Absent | No route, no component |

**Status:** resolved