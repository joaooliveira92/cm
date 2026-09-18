# 01: Screen inventory — what of screens 181–193 exists, and what the data layer already supports

Type: task

## Question

Which of screens 181–193 (Media Centre through Communication History and Transcript) already have a
route, component, or data model in the codebase, and which are entirely absent?

Classify each screen as:

- **Exists** — a route and component ship that match the screen's purpose
- **WIP stub** — a route exists but the component is a placeholder with no real content
- **Absent** — no route, no component

Then, separately and more importantly, answer the data-layer question, because Group M is a game
system rather than a set of views over existing data:

- What does `packages/shared`, `packages/contracts` and `packages/game-engine` already model that
  these screens would need? Specifically: manager reputation, player/squad morale, board confidence,
  any relationship or opinion model, any generated-text mechanism.
- What does the **News Message / News Inbox** implementation (Screen 24) actually do, and where does
  its data come from? It is the one shipped concept adjacent to this group, and Screen 181 "Media
  Centre" risks becoming a second name for it. Record what News Message models, what its event
  sources are, and where the seam would be.
- Is there any existing generated or templated text in the game, and is it seeded?

This is a fact-finding ticket. It decides nothing — it exists so ticket 02's scope decision is made
against what is actually there, not against an assumption. Do not propose scope here.

**Blocked by:** None

**Status:** ready-for-agent
