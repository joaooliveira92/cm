# Map: retro-match-screen

Label: wayfinder:map

> Status: charted. Ticket 02 (compliance-gap audit) is **resolved** during charting; its findings feed
> the disposition grilling 01. Frontier open — 04 takeable now; 01 is blocked-by-02 but 02 is now
> resolved, so 01 is unblocked; 03 blocked by 01.

## Destination

A **decision plus a plan** for the "Retro Football Manager Match Screen" brief. The effort's way is
to answer, one decision at a time, what happens to the **already-existing, uncommitted
`apps/desktop/src/renderer/components/match-screen/` scaffold** aboard `@cm-clone/desktop`'s React
renderer — is it the brief's answer (kept and finished to brief compliance), or a false start to be
deleted — and, on keep, a **spec** describing the delta that brings it to compliance (~the brief's 27
sections: runtime validation, accessibility, interaction, tests, responsive scaling, visual
fidelity) and how it mounts (standalone demo vs. replacement of the server-driven `MatchDayScreen`).
Plan-only: the map hands decisions and a spec to `/cm-to-spec` → `/cm-to-tickets` → `/cm-implement`,
it does not build.

## Notes

- Domain: the `@cm-clone/desktop` Electron renderer (React 19, Tailwind 4, Effect stack, all data
  over the typed `window.cmClone.call` IPC channel). The live app's match view is
  `apps/desktop/src/renderer/MatchDayScreen.tsx` — server-driven commentary feed, ~640 lines; it does
  **not** use the scaffold.
- An uncommitted scaffold already exists at `apps/desktop/src/renderer/components/match-screen/`
  (~2,300 lines, all untracked, timestamps today 20:46–20:52): Sidebar, Scoreboard, PrimaryTabs,
  MatchIncidents, FixturePanel, SecondaryTabs, PossessionPanel, BottomCommandBar, StadiumOverlay,
  `types.ts` (a near-match of the brief's proposed data model), formatters incl. ordinal dates, three
  mock fixtures matching brief scenarios 1–3, plus a `styles.css`. A **stale broken duplicate** sits
  at the `components/` level (`MatchScreenDemo.tsx`, `mock-fixtures.ts` importing a nonexistent
  `MatchScreenStateSchema` — it references `types.ts` exports that `match-screen/types.ts` does not
  define). Provenance unknown; that is ticket 01's first question.
- Stack decisions inherited, not re-litigated: renderer is React 19 + Effect; runtime validation
  follows the repo standard (**Effect Schema**, already used in `@cm-clone/contracts` and
  `MatchDayScreen`), not Zod. `match-screen/types.ts` is currently compile-time-only.
- The brief's three reference screenshots are **not** in the repo. References A/B/C are described in
  the brief text (Sunderland–Blackburn ET cup; Wolves–Charlton high-scoring league; Tottenham–
  Blackburn draw). Fidelity comparison depends on ticket 04 finding them.
- Related effort: [keyboard-first-renderer](../keyboard-first-renderer/map.md) charts keyboard-first
  work on this same renderer; its ticket 11 already designs match-day live keyboard control for
  MatchDayScreen. If ticket 03 lands on "replace MatchDayScreen", that map's Notes and ticket 11 must
  be read, not rediscovered.
- Skills: grilling + domain-modeling for the disposition (01) and mount (03) decisions; research for
  the compliance audit (02); task for the references hunt (04).
- Say names, not bare ids.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [02-compliance-gap-audit](issues/02-compliance-gap-audit.md): **the scaffold is a partial build, not a finished brief answer** — all 27 sections audited with file:line evidence. §23 tests entirely unbuilt, no runtime validation, no interaction/a11y layer (Options menu, roving tabs, `tabpanel`), no 4:3 scaling, plus structural defects (incidents grid miswired at `styles.css:485`, preformatted fixture dates, clock model can't represent the calendar sidebar mode) and scenario gaps (Scenario 1 periods don't sum to 5-3, Scenario 3 has 3 tabs not 5). Fact-finding only; the keep-vs-delete choice is ticket 01's.

## Not yet specified

- **Runtime validation layer.** The scaffold's `types.ts` is compile-time-only, but the brief
  requires runtime validation of fixture data before render. Sharp enough to ticket once 01 lands;
  almost certainly Effect Schema by repo precedent — expect this to graduate as a compliance item
  inside the keep-path spec rather than a standalone decision.
- **Visual-fidelity enforcement.** Whether the brief's section-24 checklist and section-23 visual
  regression shots are executable at all depends on ticket 04 producing the reference screenshots.
  If none exist, the fidelity target degrades to "scaffold + brief text are the contract" and the
  checklist is re-scoped accordingly.

## Out of scope

- **Redoing the whole app or its match engine.** The brief's Explicit Non-Goals (no simulation
  engine, no player DB, no trademarks, no multiplayer, no transfer system, no 3D engine, no
  mobile-first redesign) bound this effort. `MatchDayScreen`'s existing simulation interacts with
  this surface only through the mount decision in 03.
- **Keyboard-first architecture.** That is `.scratch/keyboard-first-renderer`'s destination. This
  effort respects its decisions (ticket 11 especially) when the mount is decided; it does not
  re-chart them.