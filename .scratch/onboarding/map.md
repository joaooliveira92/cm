# Map: Onboarding

Label: wayfinder:map

## Destination

A written **spec document** (`.scratch/onboarding/spec.md`), mirroring cm-clone's and Scouting's
shape, for the game's **onboarding**: everything from launching the app to a new player finishing
their first match knowing what to do. Two halves, deliberately kept as one effort because they are
the same experience — **pre-career setup** (manager creation on an archetype/pillar system, club
selection as implicit difficulty) and the **in-career first-hours teaching layer** (event-driven
learning, the Continue rhythm, useful defaults, contextual help). Ready to hand off to a separate
implementation effort.

## Notes

- Seeded by [docs/game-onboarding.md](../../docs/game-onboarding.md), a retrospective analysis of
  Championship Manager 03/04's onboarding. It is a **reference, not a target**: keep the
  simulation-first spine (immediate agency, event-driven learning, useful defaults, no scripted
  tutorial) and treat its section 13 ("What made it difficult") as a list of problems to solve
  rather than reproduce. Faithfully reproducing "the game explained too little" is not a goal.
- Its sections 2 (nations/leagues/full-detail) are structurally inapplicable: v1 is a single
  fictional league with a fixed 20-club world. See Out of scope.
- **Manager identity is mechanically load-bearing**, overriding the doc's purely-representational
  03/04 model. Model locked by ticket 01: four Manager Pillars — Tactical Acumen, **Influence**
  (renamed from Man-Management by ticket 02), Regimen, Technical Coaching — on a 1–5 scale summing
  to 12, via four preset Archetypes or Custom.
  Vocabulary is in [CONTEXT.md](../../CONTEXT.md); rationale in the
  [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).
- **Codebase survey, corrected by ticket 02**: the codebase has *no* morale, loyalty, youth,
  discipline/fines, dressing-room, press-conference, or coaching-staff system — those effects are
  **cut** from v1. But the charting survey was wrong that Training and the injury system were
  mid-design: both are **shipped**, alongside transfer negotiation, Condition, tactics, and Player
  Development. All four pillars bind to shipped systems; **Scouting is the only effort still in
  flight**, and the only remaining deferral.
- **Pillar bindings are settled** (ticket 02): five bindings on shipped seams only — Tactical Acumen
  to tactical resolution, Influence to selling-club negotiation, Regimen to both the Condition
  lifecycle and injury severity, Technical Coaching to the Training Focus multiplier. Magnitudes are
  still fog.
- Existing mechanisms this effort should reuse rather than reinvent: `manager_status` /
  board expectations and sacking ([ADR-0006](../../docs/adr/0006-board-objectives-and-manager-sacking.md)),
  Stature Tier as the per-club difficulty gradient, `advanceCalendar` as the Continue command.
- Skills every session should consult: `grilling` and `domain-modeling`. Manager-pillar vocabulary
  lands in [CONTEXT.md](../../CONTEXT.md) as it is decided, not in a batch at the end.
- Planning only. This map produces decisions and a spec, not code.

## Decisions so far

<!-- one line per resolved ticket; the ticket holds the detail -->

- [Manager pillars & archetype set](issues/01-manager-pillars-and-archetypes.md): four Manager
  Pillars (Tactical Acumen, Influence — resolved here as Man-Management, renamed by ticket 02 —
  **Regimen**, Technical Coaching), 1–5, summing to exactly
  12; four curated Archetypes as examples not constraints (The Professor, The Motivator, The
  Sergeant, The Academy Head); every legal distribution allowed including 3/3/3/3 and 5/5/1/1; a 1 is
  severe but never a soft lock; values permanently visible; persisted as a plain immutable
  `manager_profile` row inside `createSave`, not a Decider and not an event.

- [Which Manager Pillar effects bind in v1](issues/02-which-pillar-effects-bind-in-v1.md): five
  Bindings on shipped systems only (Tactical Acumen→tactical resolution, Influence→selling-club
  negotiation, Regimen→Condition lifecycle *and* injury severity, Technical Coaching→the Training
  Focus multiplier); **Man-Management renamed to Influence** because its only shipped surface is
  club-to-club dealing; every other claimed effect cut except Scouting; Pillars enter the engine as
  explicit parameters and the full Distribution is snapshotted into `PersistedMatchStarted`.

- [Club selection at new game](issues/03-club-selection-at-new-game.md): all 20 clubs freely
  selectable, no gating and no default; the complete league is generated **before** the choice (with
  `initializeSeasonEconomy` lifted out of `startSeason` so budgets and contracts are readable at
  selection time) and the chosen club committed atomically by stable `clubId`, deleting
  `is_user_club = index === 0`; a compact list plus detail panel states resources, squad, and
  expectations explicitly but never as a numeric difficulty score and never promising an
  unimplemented consequence; last-season position omitted for want of any prior season; Archetype and
  club stay orthogonal with no recommended or discouraged pairing; the free-text save name survives
  as an optional label behind a **Manager · Club · Season** identity.

- [Does onboarding need an inbox](issues/05-does-onboarding-need-an-inbox.md): **no** — no inbox, news
  screen, or message feed in v1, and the locked six-screen list stands. The decisive fact is that
  nothing in the simulation waits for the player: `runAiTransferWindow` runs inside `advanceCalendar`
  and `aiPlaceBid` resolves the selling club even when that seller is the human's club, so
  `incomingBids` is structurally empty in shipped play. Everything else an inbox would show is already
  on `AdvanceCalendarResult`. Notification is distributed instead: transient outcomes render from the
  Continue result (shape owned by ticket 06), persistent state is surfaced by the screen that owns it.
  "Inbox" is now reserved for the Transfer market's Bid queue, defined in
  [CONTEXT.md](../../CONTEXT.md) as **Transfer Inbox**.

## Not yet specified

- **Per-binding magnitude and tuning** — ticket 02 fixed the five binding sites and each one's
  permitted dimension, but no numbers. What a Tactical Acumen of 5 vs 1 is worth at each site is a
  further round, plausibly one ticket per bound system. Two hard invariants already constrain it: the
  effective focused-development multiplier must stay above 1.0 at every Technical Coaching value, and
  higher Regimen must never increase Condition decay or reduce recovery.
- **AI manager assignment and AI manager Archetypes** — whether AI managers have Pillars at all, how
  they would be assigned, and whether AI-vs-AI fixtures consume them. Ticket 02 deliberately assigned
  no default (a placeholder `3/3/3/3` would settle this by accident). These stay fog deliberately:
  ticket 03 does not require them, but neither does it rule that they fall outside onboarding — their
  behaviour, ownership, and delivery boundary are genuinely unresolved, which is fog, not a scoping
  exclusion. No ticket may implement them or introduce defaults that constrain their future design.
- **Whether Manager Pillars change over a career** (rise with success, drift with age). Adjacent to
  onboarding rather than part of it. Ticket 01 assumed immutability and three of its conclusions rest
  on it — the not-a-Decider argument, the no-snapshot determinism guarantee for match resimulation,
  and the plain-row persistence choice. If this ever resolves to "yes", all three reopen together.
- **First-match readiness affordance.** Ticket 05 found that the human's club starts with **no
  Tactic** (`aiClubs.test.ts` asserts every AI club gets one at Season start and "the user's club gets
  none"), and nothing tells the player. With no inbox to announce it, this needs a persistent
  affordance rather than a dismissible message. Tickets 06 and 08 own the shape; ticket 07's audit
  owns the full list of unset-at-creation state.

- **Squad-screen legibility** — teaching which Attributes matter for which Position without a
  role-recommendation system. Shape depends on where ticket 08 draws the contextual-help line.
- **Scouting integration contract.** Ticket 02 cut this from three coordination targets to one:
  Training and the injury system have shipped, so their Pillar effects are in v1 implementation scope,
  not coordination. Scouting must accept Tactical Acumen as an immutable manager input affecting
  information quality, confidence, or interpretive accuracy — never replacing Scout capability,
  revealing ground truth, or gating permission. The contract needs delivering into
  `.scratch/scouting/` durably; the exact effect is Scouting's to choose.
- **E2E coverage for the onboarding flow**, in the shape the wave-1/wave-2 specs established.

- **Save-list read model.** Ticket 03 fixed the row's primary identity as Manager · Club · Season but
  not what backs the rest of it. `season_number`, `phase`, `current_matchday`, and
  `save_meta.created_at` exist; a last-played timestamp does not, and there is no season *year* label
  (v1 renders "Season 1", not "2026/27" — a calendar label would imply a chronology the schema does
  not contain). Nothing may show or sort by "last played" until this resolves, and filesystem
  modification time must not silently become a domain-level last-played value: the decision must
  settle whether the timestamp is persisted inside the save, whether opening a save updates it,
  whether previews are stored or rebuilt, and how unavailable or corrupted saves behave.
- **Optional save label: schema and compatibility.** Ticket 03 wants the free-text name demoted to an
  optional secondary label, but `save_meta.name` is `NOT NULL` on every save file already written.
  Making it genuinely optional needs its own schema-change and compatibility decision. Until then the
  name stays stored and required, and an empty string must **not** be overloaded to simulate
  optionality — that keeps the constraint while destroying the distinction between "no label" and "a
  blank label".
- **Provisional-save cleanup.** Generating the world before the choice means a `.sqlite` file exists
  for a career the player may abandon. Deferring the `save_meta` insert makes it invisible to
  `listSaves`, but whether orphan files need an actual sweep is unsettled.

## Out of scope

- **World configuration** — nation/league selection, full-detail toggles, a world seed, squad-generation
  variance. The doc's section 2 has no counterpart in a single fixed fictional league. A seed is
  genuinely useful, but it serves testing and world-sharing, not onboarding; it belongs to whoever
  owns world generation.
- **Manager reputation gating which clubs you may take.** A career-progression feature wearing an
  onboarding costume. Club selection stays free across all 20 clubs (ticket 03).
- **A scripted first-run tutorial** — overlay sequences, forced click-throughs, a staged first week.
  Directly contradicts the simulation-first spine this effort keeps.
- **A news/message feed** — the seed doc's section 6 inbox, a message entity, an event→message
  projection, a `messages` table, read/unread state, or an RPC method returning messages. Rejected by
  ticket 05 and not to be reopened from the seed doc. A career-history log is a separate feature to be
  argued on its own merits, owned by whoever owns the long-run career loop, not by onboarding.
- **Ruleset versioning for deterministic replay.** Ticket 02 snapshots the Pillar Distribution per
  match, which protects replay from a future change to the manager's Distribution. It does *not*
  protect against changes to the tactical, Condition, injury, or development **formulas** — a
  pre-existing hazard that would exist even if Manager Pillars were never built (a tuning change to
  `PLAYER_DEVELOPMENT_FRACTION` today already alters how stored matches replay). ADR-0007 has no
  version concept. A feature-local `managerPillarRulesVersion` was specifically rejected as
  incomplete protection that implies false safety. This needs its own ADR, owned by whoever owns
  simulation determinism.
- **Real-world data packs, multiple leagues, multiple simultaneous saves.** Settled in cm-clone's v1
  scope; not reopened here.

- **Historical league state.** A previous-season table, last-season finishing positions, promotion and
  relegation history. Ticket 03 omitted last-season position from club selection rather than fabricate
  it; generating real history is a world-model feature, not an onboarding one.
- **A universal numeric difficulty rating** for a club. Rejected by ticket 03 as collapsing resource
  scarcity, squad quality, board pressure, and rebuilding scope into one number that is wrong at both
  ends of the range.
- **Archetype-club synergy bonuses or incompatibility penalties**, and any UI that names an optimal
  Archetype for a club. Ticket 03 kept the two choices orthogonal; no shipped Pillar binding varies by
  Stature Tier, so any such relationship would have to be built first.
- **Starting unemployed, multiple simultaneous human managers, and mid-creation regeneration of
  individual clubs.** All three redraw what a save *is*; ticket 03 assumes exactly one human-managed
  club fixed at creation.
