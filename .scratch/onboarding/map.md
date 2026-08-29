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
- **Dependency correction (06 ↔ 10).** Ticket 06 requires that invalid or incomplete match preparation
  stop progression before the human's Fixture resolves. It specified that boundary without establishing
  that a seam exists where the rule can execute: `advanceCalendar` resolves the human's Fixture inside
  `resolveMatchday` and returns only afterwards. **Ticket 10 is no longer blocked by ticket 06** — it owns
  the prerequisite decision (explicit pre-match boundary, or headless resolution with mandatory
  preflight). Ticket 06's intent stays authoritative; its mechanism and implementation are blocked by
  ticket 10. Binding invariant on every answer ticket 10 may give: *a human Fixture must not resolve
  while required match preparation is invalid or absent*, and ticket 10 must name the pre-resolution
  boundary or preflight operation that enforces it. **Resolved by ticket 10**, which supplied the boundary: Continue stops at a persisted pre-match boundary before resolving any of the human's Matchday.
- **Onboarding owns the Training Focus surface, corrected by ticket 11.** The charting assumption that
  "the Training effort owns the Training UI" was false: that effort is **closed** (all five tickets
  resolved, fog empty) and ruled *Training screen UI layout* out of scope, deferring it to an unnamed
  hand-off effort; cm-clone rules **Training** out of scope entirely and locks six screens with no
  Training screen. No effort owned it. Since the required surface is a per-player column on **Squad**,
  onboarding owns the renderer integration — not the Training domain, which stays authoritative for
  Focus semantics, `setTrainingFocus`, persistence and Player Development. **Ticket 02 stands
  unamended**: the surface is required for v1, so Technical Coaching keeps its binding, though that
  binding is not *satisfied* until the Pillar actually parameterises the resolver. The principle this
  produced is now in [CONTEXT.md](../../CONTEXT.md) under **Manager Pillar Binding**: a Binding is
  **player-reachable** only when every player-controlled input it reads can be inspected and changed
  through the shipped renderer.

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


- [Where the Continue command lives](issues/06-where-continue-lives.md): Continue becomes a
  **persistent application-shell control** next to the screen tabs, out of `LeagueTableScreen`; keeps
  the label "Continue" (the save-list "Continue career" is renamed to clear the collision) and never
  expresses time in days or dates. All six `AdvanceCalendarResult` fields interrupt, and one press
  renders **one structured durable surface** carrying every consequence of that advance — not a toast,
  not an inbox, no read/unread. Anything absent from the result contract passes silently, so the UI
  may not claim to stop whenever something needs attention. Readiness is a **derived persistent state**,
  never dismissible: incomplete preparation does not block advancement in general but **does block
  crossing into the human's match**, which requires deleting the fallback that today hands the user's
  club a machine-picked Tactic. Space activates Continue where global shortcut handling is safe.
  Function-key screen navigation stays out.

- [New-game flow: sequence and screens](issues/04-new-game-flow-sequence.md): creation is **three
  steps, manager first** — Manager, Club, Review — with free return to any reached step and no
  regeneration on return. World generation starts on New career and runs **underneath the manager
  step**, so the 20-squad wait is spent on the only decision that does not depend on the world; club
  selection stays gated until every club is comparison-ready, behind a control that states why, with
  determinate progress only when its unit is a fully selection-ready club and never progressive club
  reveal. `createSave` splits into **`beginCareer`** (schema, generation, season economy, no
  `save_meta`) and **`commitCareer`** (manager profile, human club, Board Objective, `manager_status`,
  AI Tactics, season start, `save_meta` — one transaction), superseding ticket 01's "generation and
  manager commit are the same moment" while leaving its Pillar model intact. Arrival is **Squad**,
  immediately, with the **Board Objective added to the persistent Manager · Club · Season shell
  identity** as standing state and the shell closed to further additions. Cancel deletes the
  provisional database through an idempotent `discardCareer` whose failure never makes a career
  visible; a cancelled world is never reused.


- [Audit: what a brand-new save already has set](issues/07-first-match-readiness-audit.md): a fresh save
  has fixtures, budgets, contracts, Board Objective and Condition 100 for all 500 players, AI Tactics for
  19 clubs, **no user Tactic, and no Training Focus rows** — and **nothing anywhere refuses to proceed**.
  `startMatch` and `advanceCalendar` each silently substitute a machine-picked XI through **two different
  fallbacks that disagree** (`synthesizeDefaultTactic` hard-codes 4-4-2; `pickBestFormationTactic` chose
  3-5-2 for the same squad), so ticket 06 must delete two, and may only delete the *fallback use* of the
  second since AI clubs still need it. The Tactics screen renders a null Tactic as an ordinary 4-4-2 with
  blank selects, indistinguishable from a saved one. No availability concept exists at all — injury
  severity only modulates recovery. Exactly **one** condition is unset-and-configurable (no Tactic /
  starting XI, blocking at the match boundary), which collapses the per-condition severity question.
  `SetTrainingFocus` is shipped server-side with **zero renderer callers** (ticket 11 owns the
  integration contract; the Training effort owns the UI).


- [Where the human's League match is actually played](issues/10-where-the-human-match-is-played.md):
  Continue advances to the human club's scheduled Fixture and **stops before resolving any of that
  Matchday's ten Fixtures**, persisted as nullable `season.awaiting_fixture_id` (+ `awaiting_match_id`
  linking the started stream) with `phase` unchanged. The stop *is* the readiness gate, so repeated
  Continue is safe structurally rather than by guard. After readiness passes the player picks **Play**
  or **Quick result** — the same `runSimulation`, the same `PersistedMatchStarted` stream, differing
  only by live reveal and command journal; the ticket's "two separate simulators" premise was false and
  is withdrawn. An **explicit idempotent completion command** commits the human result plus the other
  nine Fixtures in one transaction. Seeds derive from `SeasonStarted.seed` + `fixtureId` (killing a
  quit-and-retry re-roll); `synthesizeDefaultTactic` is deleted and `getTacticForClub`'s fallback
  removed for *every* club; `startMatch` becomes Fixture-bound and the free-opponent exhibition surface
  is deleted. **Onboarding owns the contract; the cm-clone match effort owns delivery.**

- [Where the contextual-help line sits](issues/08-where-the-contextual-help-line-sits.md): help is a
  **typed projection of the simulation model** — a mechanical claim is permitted only where it traces to
  authoritative data, derived state, or resolver output, with presentation templates free to make that
  readable but never to add mechanics, strategy or causality. The knowledge floor is the game's own
  model, never real football. **Displayability follows provenance**: `firstTouch` and `determination`
  leave player-facing screens (read by nothing), while `bravery`, `aggression`, `agility` and
  `naturalFitness` stay, explained by collision/injury/Condition rather than ratings. One focusable
  **Term Disclosure** carries meaning; decision-critical values (Role Rating, Position, Condition) stay
  inline; no modals, no hover-only, **no tapering and no per-save help state**. Outcome-specific causal
  claims require structured resolver output — a Pillar value is never evidence. One bounded
  **Irreversibility Disclosure** exception covers the un-retryable match seed at the pre-match boundary.
  Labels and provenance live in `packages/shared` as exhaustive typed registries so drift fails
  `check:all`. **Amends ticket 06**: `AdvanceCalendarResult` must carry the pre-match boundary and typed
  readiness blockers, rendered happened → next → unresolved → actions with absent sections omitted.
  Onboarding delivers Squad, Tactics, Transfers, creation and boundary help; Match day and Training help
  go to their efforts.


- [Squad-quality and depth summary bands](issues/09-squad-quality-summary-bands.md): **Squad Quality**
  is the mean Position Rating of the strongest formation-valid XI — all five Formations evaluated,
  greedy slot fill, no player twice — cut into **six absolute bands** (Very Weak / Weak / Competitive /
  Strong / Very Strong / Elite at 35 / 42 / 49 / 56 / 63), derived on read and never persisted.
  Measurement of the shipped generator drove three reversals: `SQUAD_COMPOSITION` gives every club the
  same 25-player composition, so **Squad Depth is cut**; a formation-aware measure reorders the eight
  `mid` clubs differently from a position-blind one in 93% of leagues; and cross-tier inversion is rare
  per pair (0.5%) but present somewhere in 36% of leagues, so inversions are **shown honestly** rather
  than banded within tier, clamped, or smoothed. **Amends ticket 03**: the derived Challenge label and
  its prose description are removed as a recombination of two adjacent fields whose vocabulary
  ("Rebuild", "Title Contender") names unmodelled mechanics and outcomes; the row becomes club identity,
  Stature Tier, Board Objective and the Squad Quality band, with the band only and no raw score.
  `pickBestFormationTactic`'s algorithm lifts to a pure `selectBestFormationXI` in
  `packages/shared/src/bestXi.ts` (pure and **partial**, not total; `SquadTooSmallError` and `Tactic`
  construction stay in the `aiClubs.ts` wrapper), with thresholds in `squadQuality.ts`.


- [Onboarding's integration contract for the shipped Training system](issues/11-training-focus-has-no-ui.md):
  a player-reachable Training Focus surface is **required** for onboarding-complete v1 — Technical
  Coaching is the only Pillar whose input the player must supply — delivered as an **editable per-player
  column on Squad**, owned by onboarding because the Training effort is closed with UI out of scope and
  cm-clone excludes Training; **no seventh screen** and cm-clone is not reopened. **None** is a
  first-class named value, never a readiness blocker; the option set offers only Categories that can
  affect that player, so **Goalkeeping is a silent no-op** for outfielders and is withheld, enforced at
  the command boundary too. Development reads the standing Focus **live at `SeasonConcluded`** — no
  duration, history or partial credit — and the disclosure says so. Updates are **confirmed**, rendering
  `TrainingFocusView.focus`; `SaveSackedError` delegates globally. `technicalCoaching` exists nowhere in
  the code, so the **Technical Coaching clause is gated** on the Pillar entering the resolver, and
  because the focused fraction (0.975) **accelerates decline** past the age-ceiling, no copy promises
  improvement. **Partially supersedes ticket 08** on who owns Training help for the Squad surface.


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

- **Scouting integration contract.** Ticket 02 cut this from three coordination targets to one:
  Training and the injury system have shipped, so their Pillar effects are in v1 implementation scope,
  not coordination. Scouting must accept Tactical Acumen as an immutable manager input affecting
  information quality, confidence, or interpretive accuracy — never replacing Scout capability,
  revealing ground truth, or gating permission. The contract needs delivering into
  `.scratch/scouting/` durably; the exact effect is Scouting's to choose.
- **E2E coverage for the onboarding flow**, in the shape the wave-1/wave-2 specs established.

- **AI Fixture seed persistence.** AI-vs-AI Fixtures draw an unrecorded `Math.random()` seed in
  `resolveFixtureScore` and persist only their final score, discarding events, so their timelines cannot
  be reproduced from event history — ADR-0002's reproducibility guarantee covers only matches entering
  through `PersistedMatchStarted`. This predates the map and would exist without a pre-match boundary.
  It is **distinct from ruleset versioning** below: seed persistence concerns recording simulation
  *inputs*, ruleset versioning concerns preserving the *transformation* applied to them. Ticket 10
  explicitly refused to add nine AI seeds to `MatchdayResolved` as a side effect of building the
  boundary. Owned by whoever owns simulation determinism, not by onboarding.

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
- **Provisional-save cleanup after abnormal termination.** Ticket 04 settled the *normal* path:
  Cancel and ordinary creation-flow shutdown delete the provisional database through an idempotent
  `discardCareer`. What stays open is everything a shutdown handler cannot reach — process kill, OS
  crash, power loss, storage failure. A policy must decide when stale provisional files are detected,
  how their age is determined, whether they are swept automatically, whether incomplete creation can
  be resumed, how a provisional file is distinguished from a corrupted committed save, and whether
  scanning happens at startup or at the next `beginCareer`. No ticket may establish a startup garbage
  collector as a side effect of implementing the creation flow.

- **An honest generation-progress measure.** Ticket 04 permits a determinate `14 of 20 clubs` count
  only when the unit means a club fully ready for selection — generated club, generated squad,
  initialized economy, and whatever club selection needs to derive squad quality — and otherwise
  mandates an indeterminate wait. Whether `generateWorld` and `initializeSeasonEconomy` can expose
  such a measure, and at what cost, is unexamined. This is a generator question, not a UI one, and
  the flow is fully specified either way. Ticket 09 narrows what "selection-ready" requires: Squad
  Quality reads only the generated squad's Position Ratings, so it needs no economy data — but the
  panel still shows both budgets, so the economy remains part of the unit.
- **Training model corrections, delivered into
  [`.scratch/training/spec.md`](../training/spec.md).** Two, both recorded there by ticket 11 against a
  closed effort with no active owner, and neither onboarding's to implement. (i) Ticket 08's
  **orphaned-Attribute** defect: `developPlayer` develops every entry in `ALL_ATTRIBUTES` while a Focus
  biases a whole Category, so Technical or Mental focus spends part of its multiplier on `firstTouch`
  and `determination`, which no shipped table or resolver reads and which ticket 08 removed from
  player-facing screens — give them a shipped consumer or exclude them from focus allocation. (ii)
  Ticket 11's **focus-accelerated decline**: the focused fraction is 0.975 against 0.65, so where the
  age-ceiling sits below the current value (Physical past 30) Focus accelerates the loss, contradicting
  the spec's "purely additive, no downside" — accept it and amend the spec, or stop applying the
  multiplier to a negative gap. Onboarding may not change development behaviour to fix either, and
  until they resolve no onboarding copy may overstate the visible payoff of Training Focus or Technical
  Coaching. Same delivery obligation shape as the Scouting contract above.
- **Training Focus applicability at the command boundary.** Ticket 11 requires `SetTrainingFocus` to
  reject a Category containing no Attribute present on the target player, with a typed error. Whether
  the eligibility fact is derivable from `SquadPlayerView` or needs a read-model change, how existing
  pre-release saves holding a `goalkeeping` focus on an outfielder are normalized, and what the error is
  named are implementation questions for whoever delivers the column — but the rule itself is a
  behaviour change to a shipped, tested Training command, not a renderer concern.
- **How much of the Bid/valuation model Transfers exposes numerically.** Ticket 08 put Transfers help
  under onboarding delivery and permitted exact seller thresholds on provenance grounds (the resolver
  reads them), but did not decide whether those numbers sit inline, behind a Term Disclosure, or stay
  qualitative. The screen may not imply that seller responses are mysterious or personality-driven
  when they are a deterministic threshold shifted by Influence.
- **The other Irreversibility Disclosure candidates.** Ticket 08 established the exception and applied
  it only to the match seed at the pre-match boundary. Season conclusion, save deletion and the
  immutability of creation-time Pillars each look like candidates, but each needs its own ticket to
  confirm the actual irreversibility before any disclosure is written — the exception is not a licence
  to warn about ordinary mutations.
- **Variable squad composition, and any future Squad Depth measure.** `SQUAD_COMPOSITION` gives every
  generated club the same 25 players in the same positional shape, so positional cover is constant by
  construction and Squad Depth was cut from club selection by ticket 09. Whether world generation
  should vary squad size, positional cover, or reserve quality per club is genuinely undecided and
  owned by whoever owns the generator — it would alter every generated squad's shape. That variation
  is the prerequisite for any future Depth field; a better depth *formula* is not, and ticket 09
  measured the strongest candidate (recomputing the best XI with each starter absent) at 2.0–2.3
  rating points across all three tiers. No onboarding ticket may change `SQUAD_COMPOSITION`.
- **Availability-aware XI quality.** Ticket 09's Squad Quality is **structural**: the strongest
  formation-valid XI from the current registered squad, with no availability filtering, because ticket
  07 found no availability concept exists anywhere (injury severity only modulates recovery). Whether
  the game should also expose a currently-available measure — for match preparation, opponent
  comparison, or readiness — is downstream of a formal availability model that does not exist, so it
  cannot be ticketed yet. Binding constraint on whoever builds it: it takes a **distinct name**
  (*Available XI Quality*, *Current Selection Strength*) and never silently changes what Squad Quality
  means.
- **In-career league-wide Squad Quality comparison.** Ticket 09 keeps the band selection-only for v1:
  its meaning is comparative, and the Squad screen shows one club beside the per-player Overall and
  Position Ratings the band aggregates. Whether a future view should compare current Squad Quality
  across all 20 clubs is unresolved, needs an owning effort, and must preserve the structural-versus-
  available distinction above. It does not belong on the League Table by default merely because that
  screen already compares clubs — that is a separate information-architecture decision.


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
- **Friendly / exhibition matches.** Ticket 10 deleted the shipped free-opponent Match day surface
  (`listOpponentClubs` as an entry mechanism, arbitrary `opponentClubId`, automatic home seating,
  career-detached starts). It always seated the user at home so it could not express an away Fixture,
  and it wrote back to nothing. A real friendly feature may return later with its own decisions on
  scheduling, home/away, Condition and injury effects, statistics, career history, and competition
  separation — but the current surface must not be preserved as an undocumented shortcut meanwhile.
- **Abandoning a started match, and any bulk "advance several Matchdays" affordance.** Once
  `PersistedMatchStarted` exists the setups and seed are authoritative, so navigation and restart resume
  rather than restart. Ticket 10 makes an explicit player action mandatory per Matchday and specifies no
  bulk-advance path; adding one would reopen the boundary's exactly-once guarantees.

- **Starting unemployed, multiple simultaneous human managers, and mid-creation regeneration of
  individual clubs.** All three redraw what a save *is*; ticket 03 assumes exactly one human-managed
  club fixed at creation.

- **Per-screen purpose blurbs** — authored prose whose only job is to say what a screen is for
  ("Use this screen to manage your squad"). Rejected by ticket 08 as the manual page distributed one
  paragraph at a time: it projects no data, describes designer intent rather than mechanics, and goes
  stale once the player has seen the screen. Derived empty states reporting authoritative current
  state remain in scope; the line is state versus purpose.
- **Tapering, dismissible, or first-career-only help**, and any per-save help state (seen, dismissed,
  experience level, tutorial completion). Rejected by ticket 08 on the ground ticket 05 already
  established for the tapering inbox. A returning-player refresher is a different feature and would
  have to argue for the state concept on its own merits.
