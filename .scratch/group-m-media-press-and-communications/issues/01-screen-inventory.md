# 01: Screen inventory — what of screens 181–193 exists, and what the data layer already supports

Type: task
Status: resolved

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


## Answer

**All thirteen screens (181–193) are Absent** — no route, no component, no screen id, no action
scope, no nav entry. Not one is even a WIP stub, which matters because the repo *has* a recognisable
stub idiom (~30 screens render `WIP — Placeholder screen`, e.g.
`apps/desktop/src/renderer/boardConfidence/BoardConfidenceScreen.tsx:12`), so Absent is
distinguishable from stubbed here and none of these is stubbed. The only `media` in the renderer is
`content/mediaAsset.ts` (crests and flags) and `useMediaQuery` — different senses of the word.

**The data layer supports none of it.** Searched under many names, each a confirmed absence rather
than an unrun search:

- **Manager reputation** — no model. `manager_profile` holds identity and the four Pillars, immutable
  for the life of the save (CONTEXT.md:712); `manager_status` tracks outcome only
  (`db/schema.ts:900`, "never manager identity"). No scalar represents how the world regards the
  manager.
- **Player/squad morale** — no model. Per-player mutable state is fitness and contract/training only.
- **Board confidence** — no opinion that moves. The board has one annual `verdict`
  (`exceeded|met|missed`) computed from league position against a **static** tier band
  (`packages/shared/src/rules/board.ts:22-26`, "Permanently fixed per tier for v1"), plus a
  consecutive-miss counter that warns at 1 and sacks at 2. Nothing about transfers, mid-season
  results, media or player handling touches it. The word `confidence` in the codebase is exclusively
  `knowledgeConfidence`, a scouting-coverage measure.
- **Relationship/opinion model** — none. The nearest thing is the Influence Pillar modifying one
  number in one place (a selling club's response to a Bid): a per-transaction modifier, not a stored
  relationship. Staff are explicitly stateless (CONTEXT.md:559-567).
- **Generated text** — two mechanisms, both deterministic, neither a generator. Match **Commentary
  Templates** (`packages/game-engine/src/match/commentary.ts`): fixed phrasing pools, token fill,
  index picked from a hash of `(matchSeed, "tag:occurrence")`, no persisted state. And the **News
  copy table** (`packages/shared/src/news/newsCopy.ts:208`): a `switch` on event tag doing pure string
  interpolation, no randomness.

**The News Message seam.** A News Message is not a row — it is a read-time projection of one
`events` row, and its identity *is* that event's coordinates
(`"<stream_type>:<stream_id>:<seq>"`). Text is derived on read, never stored. Body copy comes from
exactly one function, `project()` (`newsCopy.ts:208`), keyed on `event.tag`, whose `default` branch
silently drops unrecognised tags — so a new event tag is inert until a branch exists. Input is fixed
to two stream selections (the whole `season` stream, and the human club's `club` stream). The only
writable state is `news_message_state` (read/archived/flagged), keyed on the same event coordinates.

Consequences for any media surface, stated as observed constraints rather than as a recommendation:
Category is a **closed literal union in three places** (contract, shared, renderer label map), so a
sixth category is a three-place edit — nothing forbids it structurally, and nothing is open for
extension by design. A message with no backing `events` row is not representable. There is no author,
recipient, threading, reply, or structured body. `actionState` exists but CONTEXT.md:915-920 insists
the inbox "is a career record, not a work queue".

**The decisive finding — CONTEXT.md already rules this out of v1.** Two recorded statements, both
verified verbatim:

> It does not govern player contracts, wage negotiation, promised playing time, dressing-room
> relationships, **media handling**, or board relations - none of those systems ship in v1.
> — CONTEXT.md:751-753 (**Influence**)

> There is no training or **press content** to occupy a date with no Fixture, so a finer-grained
> clock would have nothing to display.
> — CONTEXT.md:445-447 (**Calendar**)

The second is load-bearing: the Calendar advances only by jumping between Matchdays and Transfer
Window boundaries, and the *absence* of press content is the stated reason a finer clock would have
nothing to show. Screens 184 and 185 (pre-/post-match briefings) and any deadline-bearing media
obligation assume a clock that stops on dates this game deliberately skips.

CONTEXT.md also has **no vocabulary at all** for journalist, outlet, press, interview, briefing,
rumour, speculation, public reaction, transcript, statement, publication, embargo, or deadline — and
no existing command produces text; every one mutates world state.

This ticket decides nothing. But it means ticket 02 is not an open scope question: it is a question
about **overturning a recorded decision**, which is a different and higher bar.
