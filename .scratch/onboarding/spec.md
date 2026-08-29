Status: ready-for-agent

# Onboarding — manager creation, club selection, and the first hours of a career

Synthesized from the resolved [onboarding map](map.md) and its eleven tickets
(`.scratch/onboarding/issues/01`–`11`). It introduces no decisions those tickets did not already
lock. Canonical vocabulary lives in [CONTEXT.md](../../CONTEXT.md).

## Problem Statement

A new player launches the game, types a save name, and is dropped into a career they cannot read.
The world already exists — 20 clubs, 500 players, a 380-fixture Schedule, budgets, contracts and a
Board Objective — but nothing in it tells them what they are, what they are responsible for, or what
they are supposed to do next. The manager they are playing is nobody: a free-text string with no
capability, no identity, and no consequence. The club they manage was picked for them by
`is_user_club = index === 0`.

Worse, the game is silently under-configured and never says so. A fresh save has **no Tactic and no
starting XI** for the human's club, and **nothing anywhere refuses to proceed**: both `startMatch`
and `advanceCalendar` quietly substitute a machine-picked XI through two different fallbacks that
disagree with each other, so the player's first match is played by an algorithm on their behalf, in a
formation they never chose, without being told. The Tactics screen renders that absent Tactic as an
ordinary 4-4-2 with blank selects, indistinguishable from one they saved. The one Manager-facing
input the simulation reads at season end — Training Focus — is shipped server-side with zero renderer
callers, so it cannot be set at all.

The control that drives the whole career is labelled "Advance Calendar" and lives inside the League
Table screen, as though moving time were a property of a standings view. And where the game does
explain itself, it does not: this is Championship Manager 03/04's "explained too little" failure
reproduced, not solved.

## Solution

Onboarding is everything from launching the app to a new player finishing their first match knowing
what to do — deliberately one effort, because pre-career setup and the first hours in a career are
the same experience.

**Before the career**, the player becomes somebody: a manager built on four **Manager Pillars**
(Tactical Acumen, Influence, Regimen, Technical Coaching), each 1–5 and summing to 12, taken as one
of four curated **Archetypes** or distributed by hand. Those Pillars are mechanically load-bearing —
five **Bindings** on shipped systems only — so the creation screen is a real decision, not a
character portrait. Then they choose their club: all 20, freely, no gating and no default, with the
league fully generated first so every club can be compared on its resources, its squad and its
expectations. The flow is three steps — **Manager → Club → Review** — with world generation running
underneath the manager step, so the wait for 20 squads is spent on the only decision that does not
depend on the world.

**Inside the career**, teaching is event-driven rather than scripted. There is **no inbox**, no news
feed, no message entity: nothing in this simulation waits for the player, so notification is
distributed instead — transient outcomes render from the result **Continue** already returns,
persistent state is surfaced by the screen that owns it. **Continue** becomes a persistent
application-shell control that stops at every boundary the advance can report and renders one
structured durable surface per press: what happened, what is next, what is unresolved, what you can
do.

The first match stops being something that happens to the player. Continue **stops at a persisted
pre-match boundary** before resolving any of the human's Matchday; **Match Readiness** is a derived,
never-dismissible state that blocks crossing that boundary but never blocks ordinary advancement;
both machine-picked-XI fallbacks are deleted. At the boundary the player picks **Play** or **Quick
result** — the same simulation, the same match stream, differing only by live reveal.

Explanation is **Contextual Help**: a typed projection of the simulation model, permitted to make a
mechanical claim only where that claim traces to authoritative data, derived state or resolver
output. It teaches the game's own model, never real football, never tapers, never carries per-save
state, and is delivered through one keyboard-reachable **Term Disclosure** with decision-critical
values kept inline. And Training Focus becomes reachable: an editable per-player column on Squad, so
the Pillar the player bought at creation has an input they can actually supply.

## User Stories

### Manager creation

1. As a new player, I want to choose who I am as a manager before anything else, so that the career
   I start is mine rather than a default.
2. As a new player, I want the four Manager Pillars named in plain terms (Tactical Acumen,
   Influence, Regimen, Technical Coaching), so that I can tell what each one is for without a manual.
3. As a new player, I want four curated Archetypes offered as ready-made choices, so that I can start
   quickly without reasoning about a point budget.
4. As an experienced player, I want to distribute the 12 points across the four Pillars by hand, so
   that I can build a manager the Archetypes do not describe.
5. As a player picking an Archetype, I want it to be mechanically identical to a Custom Manager with
   the same distribution, so that choosing the convenient option never costs me anything hidden.
6. As a player, I want every legal distribution allowed — including a flat 3/3/3/3 and an extreme
   5/5/1/1 — so that the creation screen is a real choice and not a menu of four.
7. As a player considering a Pillar of 1, I want it to be severe but never a soft lock, so that a
   deliberately weak dimension makes the campaign harder rather than making a system unusable.
8. As a generalist player, I want 3/3/3/3 to be reliably competent rather than uniformly mediocre, so
   that the safe choice is safe rather than merely worse.
9. As a player, I want my Pillars permanently visible in the running career, so that I can reason
   about outcomes I am getting instead of guessing at a number I set once.
10. As a player, I want my Pillars to be immutable for the life of the career, so that the identity I
    chose stays the identity I am playing.
11. As a player, I want no recommended or discouraged pairing between Archetype and club, so that the
    game does not pretend to a relationship it has not built.

### Club selection

12. As a new player, I want to choose which of the 20 clubs I manage, so that my difficulty is a
    decision rather than an accident of a generation index.
13. As a new player, I want all 20 clubs freely selectable with no reputation gating, so that nothing
    is locked behind progress I have not had a chance to make.
14. As a new player, I want no club pre-selected by default, so that I am never nudged into a choice
    I did not make.
15. As a player comparing clubs, I want a compact list I can scan alongside a detail panel for the
    one I am on, so that I can narrow the field and then read properly.
16. As a player comparing clubs, I want each row to state club identity, Stature Tier, Board
    Objective and a Squad Quality band, so that resources, squad and expectations are all explicit.
17. As a player comparing clubs, I want the detail panel to state Transfer Budget and Wage Budget
    explicitly, so that resource scarcity is a stated fact rather than something I discover in the
    market.
18. As a player comparing clubs, I want no universal numeric difficulty score, so that the game does
    not collapse four different pressures into one number that is wrong at both ends.
19. As a player comparing clubs, I want the screen never to promise a consequence the game has not
    implemented, so that nothing I read at creation turns out to be flavour.
20. As a player, I want squad strength summarised as one of six named bands, so that I can compare 20
    squads without reading 500 players.
21. As a player, I want the band to be an absolute measure rather than one banded within Stature
    Tier, so that a strong mid-tier squad reads as strong rather than as merely strong-for-its-tier.
22. As a player, I want a genuinely strong mid-tier squad shown honestly even when it outranks a weak
    big-tier one, so that the field is not smoothed into agreeing with itself.
23. As a player, I want no last-season league position shown, so that the game does not fabricate a
    history it has not generated.
24. As a player, I want my chosen club committed atomically by its own stable identity, so that a
    club I selected is the club I get.
25. As a returning player, I want my save identified as Manager · Club · Season, so that I recognise
    a career from the list without decoding a name I typed months ago.
26. As a returning player, I want a free-text label still available, so that I can distinguish two
    careers at the same club if I want to.

### New-game flow

27. As a new player, I want creation to be three explicit steps — Manager, Club, Review — so that I
    always know how much is left.
28. As a new player, I want to return freely to any step I have already reached, so that a choice I
    want to revisit is not a restart.
29. As a new player, I want returning to a step never to regenerate the world, so that going back to
    change my Archetype does not silently replace the 20 clubs I was comparing.
30. As a new player, I want world generation to start the moment I choose New career and run
    underneath the manager step, so that the wait is spent on the decision that does not need the
    world.
31. As a new player, I want club selection gated until every club is comparison-ready, so that I
    never choose between clubs the game has not finished describing.
32. As a waiting player, I want the gating control to state why it is waiting, so that a disabled
    button is never a mystery.
33. As a waiting player, I want a determinate progress count only when its unit is a fully
    selection-ready club, so that a progress bar never tells me something the generator does not
    know.
34. As a waiting player, I do not want clubs revealed progressively as they generate, so that the
    comparison I am making is never against a partial field.
35. As a new player, I want a final review step summarising manager, club and objective, so that I
    commit deliberately.
36. As a new player, I want to land on the Squad screen immediately on commit, so that my first
    moment in the career is my own players rather than a menu.
37. As a player, I want my manager, club, season and Board Objective standing in a persistent shell
    identity, so that what I signed up for is always on screen rather than announced once.
38. As a player who cancels creation, I want the provisional world deleted, so that abandoning a
    setup does not leave a half-made career in my save list.
39. As a player who cancels creation, I want a failure to clean up never to make a career visible, so
    that a broken save never appears playable.
40. As a player who cancels and starts again, I want a fresh world, so that a world I rejected is
    never quietly handed back to me.

### The career loop

41. As a player, I want one control that advances my career, so that the game has an obvious rhythm:
    inspect, decide, Continue, read the consequence.
42. As a player, I want Continue in the application shell next to the screen tabs, so that it is
    available from every screen rather than owned by the League Table.
43. As a player, I want it labelled "Continue", so that the core loop has the name the loop is
    called.
44. As a returning player, I want the save-list "Continue career" renamed, so that two different
    actions do not share one word.
45. As a player, I want Continue never to express time in days or dates, so that it never implies a
    daily clock the Calendar does not have.
46. As a player, I want one press to render one structured durable surface carrying every consequence
    of that advance, so that I never miss an outcome because it faded.
47. As a player, I want that surface ordered what happened → what is next → what is unresolved → what
    I can do, so that I read a blocker before the actions it disables.
48. As a player, I want sections with no authoritative data omitted entirely, so that I never read a
    placeholder pretending to be information.
49. As a player, I want Continue to stop at every boundary the advance can report and pass silently
    through everything else, so that stopping always means something.
50. As a player, I want no read/unread state anywhere, so that the game never asks me to administer
    my own notifications.
51. As a player, I want to press Space to Continue where that is safe, so that the loop has a rhythm
    my hands can keep.

### Readiness and the first match

52. As a new player, I want to be told that my club has no Tactic, so that I do not discover it by
    having a match played for me.
53. As a new player, I want that readiness state to be persistent and never dismissible, so that it
    stays visible for exactly as long as it is unmet.
54. As a new player, I want incomplete preparation not to block ordinary advancement, so that I can
    still move through pre-season while I decide.
55. As a new player, I want incomplete preparation to block crossing into my own match, so that no
    Fixture of mine ever resolves with setup I did not supply.
56. As a player, I want the machine-picked-XI fallbacks deleted for my club, so that the game never
    plays a formation on my behalf without saying so.
57. As a player, I want the Tactics screen to distinguish an absent Tactic from a saved one, so that
    blank selects never look like a decision I made.
58. As a player, I want Continue to stop at my Fixture before any of that Matchday's ten Fixtures
    resolve, so that the boundary is a real place I arrive at rather than a report after the fact.
59. As a player, I want that stop persisted, so that quitting and returning puts me back at the same
    boundary.
60. As a player, I want repeated Continue presses at the boundary to be safe by construction, so that
    an impatient double-press never resolves my match.
61. As a player at the boundary, I want to see the pending Fixture, the Matchday, my opponent and
    whether I am home or away, so that I know what I am preparing for.
62. As a player at the boundary, I want each unresolved blocker typed with the screen that owns
    fixing it, so that I know exactly where to go.
63. As a player at the boundary, I want to leave for Tactics or Squad and come back, so that fixing a
    blocker is not a detour out of the game.
64. As a player who fixes a blocker, I want the boundary to recompute readiness on the next read, so
    that the game reflects what I just did.
65. As a player once ready, I want to choose Play or Quick result, so that I decide how much of my
    own match I watch.
66. As a player, I want both to run the same simulation through the same match stream, so that the
    convenient choice is never the mechanically different one.
67. As a player, I want my result and the other nine Fixtures committed together in one transaction,
    so that the League Table is never half-updated.
68. As a player, I want the same match seed on a quit-and-retry, so that restarting the app is not a
    way to re-roll a result.
69. As a player, I want to be told before kickoff that the match seed is fixed and the result cannot
    be retried, so that I learn that rule from a disclosure rather than from a loss.

### Contextual help

70. As a new player, I want explanations available at the surface where the decision is made, so that
    I do not have to leave the screen to understand it.
71. As a player, I want every mechanical claim to trace to something the simulation actually reads,
    so that help never teaches me a mechanic the game does not have.
72. As a player, I want help to explain this game's model rather than real football, so that
    plausible-sounding football wisdom never misleads me about the simulation.
73. As a player, I want one focusable, keyboard-operable Term Disclosure per term, so that
    explanation is uniform and reachable without a mouse.
74. As a player, I want decision-critical values — Role Rating, Position, Condition — inline rather
    than behind a disclosure, so that making a decision never requires expanding anything.
75. As a player, I want no modals and no hover-only help, so that explanation never interrupts me or
    hides from a keyboard.
76. As a player, I want help never to taper and never to be dismissible, so that my fiftieth career
    explains itself as well as my first.
77. As a player, I want no per-save help state at all, so that the game does not judge how
    experienced I am.
78. As a player, I want Attributes shown only where a shipped mechanic reads them, so that the squad
    screen is not padded with numbers that do nothing.
79. As a player, I want `bravery`, `aggression`, `agility` and `naturalFitness` explained by the
    collision, injury and Condition models that read them, rather than by a rating, so that the
    explanation matches the reason they exist.
80. As a player, I want a Manager Pillar value never offered as an explanation for a specific
    outcome, so that the game does not attribute a result to my character sheet.
81. As a player, I want an empty state to report the authoritative current state rather than describe
    what a screen is for, so that I am told a fact rather than an intention.
82. As a developer, I want labels and provenance held in exhaustive typed registries in
    `packages/shared`, so that drift between the model and its explanation fails the quality gate
    rather than shipping.

### Training Focus

83. As a player, I want to set a Training Focus per player, so that the Technical Coaching I bought
    at creation has an input I can supply.
84. As a player, I want that control as a column on the Squad screen, so that I set it beside the
    player it applies to without a seventh screen.
85. As a player, I want **None** offered as a first-class named value, so that setting no focus is a
    choice rather than an absence.
86. As a player, I want None never to block readiness, so that a legitimate default never reads as an
    error.
87. As a player, I want only Categories that can affect that player offered, so that I am never
    invited to make a selection that does nothing.
88. As a player, I want Goalkeeping withheld for outfielders and rejected at the command boundary
    too, so that the rule holds regardless of how the command is raised.
89. As a player, I want a confirmed update rendering the stored focus, so that I know the selection
    was recorded.
90. As a player, I want to be told that development reads the standing Focus at season end with no
    duration or partial credit, so that I understand that changing it mid-season is free and that
    holding it is not what pays.
91. As a player, I want no copy promising improvement, so that the game does not oversell an effect
    that can accelerate decline for an older player.

### Developer-facing

92. As a developer, I want `createSave` split into `beginCareer` and `commitCareer`, so that
    generation and commitment are separately testable and the provisional world has an explicit
    lifetime.
93. As a developer, I want `discardCareer` idempotent, so that cleanup is safe to call twice.
94. As a developer, I want the full Pillar Distribution snapshotted into `PersistedMatchStarted`, so
    that replaying a historical match never depends on the manager's current Pillars.
95. As a developer, I want Pillars entering the engine as explicit parameters, so that no resolver
    reaches for global manager state.
96. As a developer, I want the best-XI algorithm lifted into a pure function in `packages/shared`, so
    that Squad Quality and AI tactic selection share one implementation testable without a database.
97. As a developer, I want the pre-match boundary persisted as explicit season state, so that
    readiness enforcement is a structural property rather than a guard someone must remember to call.
98. As a developer, I want match seeds derived from the Season seed and the Fixture identity, so that
    determinism does not depend on when a match happened to start.

## Implementation Decisions

**Manager identity**

- Four **Manager Pillars** — Tactical Acumen, Influence, Regimen, Technical Coaching — each an
  integer 1–5 with the four summing to exactly 12. Four curated **Manager Archetypes** (The
  Professor 5/1/2/4, The Motivator 2/5/4/1, The Sergeant 1/2/5/4, The Academy Head 2/4/1/5) are
  examples rather than constraints: every legal **Pillar Distribution** is selectable, including
  3/3/3/3 and 5/5/1/1, an Archetype is mechanically identical to the equivalent **Custom Manager**,
  and a Pillar of 1 is severe but never a soft lock. Values stay permanently visible and are
  persisted as a plain immutable `manager_profile` row — not a Decider, not an event.
  **Four Manager Pillars (Tactical Acumen, Man-Management, Regimen, Technical Coaching), 1-5, summing
  to exactly 12; four curated Archetypes as examples not constraints; visible forever; a plain
  immutable `manager_profile` row, not a Decider.** See [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).
- Exactly five **Manager Pillar Bindings**, all on shipped systems: Tactical Acumen to tactical
  resolution, Influence to selling-club negotiation, Regimen to both the Condition lifecycle and
  injury severity, Technical Coaching to the Training Focus multiplier. The second Pillar is
  **Influence**, not Man-Management, because its only shipped surface is club-to-club dealing. Every
  other claimed effect (morale, loyalty, youth, discipline, dressing room, press, coaching staff) is
  cut; only Scouting is deferred rather than cut. Pillars enter the engine as explicit parameters,
  and the full Pillar Distribution is snapshotted into `PersistedMatchStarted`.
  **Five Bindings on shipped systems only; Man-Management renamed to Influence; every other claimed
  effect cut except Scouting.** See [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).
- A Binding is **player-reachable** only when every player-controlled input it reads can be inspected
  and changed through the shipped renderer. A Binding on a system with no player-facing input exists
  mechanically but does not satisfy the creation contract, because the choice it prices cannot be
  exercised. This principle is in [CONTEXT.md](../../CONTEXT.md) under **Manager Pillar Binding**.
- Per-Binding magnitudes are deliberately unset, under two hard invariants: the effective
  focused-development multiplier stays above 1.0 at every Technical Coaching value, and higher
  Regimen never increases Condition decay or reduces recovery.

**Club selection**

- All 20 clubs freely selectable, no gating and no default. The complete league is generated
  **before** the choice — with `initializeSeasonEconomy` lifted out of `startSeason` so budgets and
  contracts are readable at selection time — and the chosen club committed atomically by stable
  `clubId`, deleting `is_user_club = index === 0`. A compact list plus detail panel states resources,
  squad and expectations explicitly but never as a numeric difficulty score and never promising an
  unimplemented consequence; last-season position is omitted for want of any prior season; Archetype
  and club stay orthogonal.
  **All 20 clubs freely selectable after world generation, chosen by stable `clubId` and committed
  atomically; the screen states resources, squad, and expectations explicitly but never as a numeric
  difficulty score; Archetype and club stay orthogonal; the free-text save name survives as an optional
  label behind a Manager · Club · Season identity.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-club-selection-at-new-game.md).
- **Squad Quality** is the mean Position Rating of the strongest formation-valid XI — all five
  Formations evaluated, greedy slot fill, no player used twice — cut into six absolute bands (Very
  Weak / Weak / Competitive / Strong / Very Strong / Elite at thresholds 35 / 42 / 49 / 56 / 63),
  derived on read and never persisted, band only and never the raw score. Cross-tier inversions are
  shown honestly rather than banded within tier, clamped or smoothed. **Squad Depth is cut**, because
  `SQUAD_COMPOSITION` gives every club the same 25-player composition. This amends the club row to
  club identity, Stature Tier, Board Objective and the Squad Quality band, removing the derived
  Challenge label. `pickBestFormationTactic`'s algorithm lifts to a pure, **partial**
  `selectBestFormationXI` in `packages/shared` (`SquadTooSmallError` and `Tactic` construction stay
  in the `aiClubs.ts` wrapper), with thresholds beside it.
  **Squad Quality is the mean Position Rating of the strongest formation-valid XI, cut into six
  absolute bands, derived on read and never persisted; Squad Depth and the Challenge label are both
  removed.** See [Agent Note](../../.agents/notes/implemented/feature/2026-08-29-squad-quality-summary-bands.md).

**New-game flow**

- Creation is three steps, manager first — Manager, Club, Review — with free return to any reached
  step and no regeneration on return. World generation starts on New career and runs underneath the
  manager step; club selection stays gated until every club is comparison-ready, behind a control
  that states why, with determinate progress only when its unit is a fully selection-ready club, and
  never progressive club reveal. `createSave` splits into **`beginCareer`** (schema, generation,
  season economy, no `save_meta`) and **`commitCareer`** (manager profile, human club, Board
  Objective, `manager_status`, AI Tactics, season start, `save_meta` — one transaction), superseding
  ticket 01's "generation and manager commit are the same moment" while leaving its Pillar model
  intact. Arrival is Squad, immediately, with the Board Objective added to the persistent Manager ·
  Club · Season shell identity as standing state and the shell closed to further additions. Cancel
  deletes the provisional database through an idempotent `discardCareer` whose failure never makes a
  career visible; a cancelled world is never reused.
  **Manager → Club → Review, with generation masked behind the manager step; `createSave` splits into
  `beginCareer` and `commitCareer`; arrival is Squad with the Board Objective in the persistent shell.**
  See [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md).
- The winning shape came from a throwaway three-variant prototype driven end to end against the real
  20 clubs, Stature Tiers, per-tier budgets and Archetype distributions: **Variant A** (stepper,
  manager first, generation masked behind the manager step) beat club-first-with-ceremony and
  single-screen-with-live-review; the losing club-first variant's persistent objective strip was
  carried over into the shell identity. Captured on branch `prototype/newgame-flow`, out of the main
  branch.

**Notification**

- No inbox, no news screen, no message feed, no `messages` table, no event→message projection, no
  read/unread state; the locked six-screen list stands. The decisive fact is that nothing in the
  simulation waits for the player: `runAiTransferWindow` runs inside `advanceCalendar` and
  `aiPlaceBid` resolves the selling club even when that seller is the human's club, so `incomingBids`
  is structurally empty in shipped play, and everything else an inbox would show is already on
  `AdvanceCalendarResult`. "Inbox" is reserved for the Transfer market's Bid queue, defined in
  [CONTEXT.md](../../CONTEXT.md) as **Transfer Inbox**.
  **No inbox, no news screen, no message feed in v1. The v1 screen list stays at six.** The
  notification load is distributed: transient outcomes render from the `AdvanceCalendarResult` the
  Continue command already returns, and persistent state is surfaced on the screen that owns it. See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

**The Continue loop**

- Continue becomes a persistent application-shell control next to the screen tabs, out of
  `LeagueTableScreen`; it keeps the label "Continue" (the save-list "Continue career" is renamed to
  clear the collision) and never expresses time in days or dates. All six `AdvanceCalendarResult`
  fields interrupt, and one press renders one structured durable surface carrying every consequence
  of that advance — not a toast, not an inbox, no read/unread. Anything absent from the result
  contract passes silently, so the UI may not claim to stop whenever something needs attention.
  Readiness is a derived persistent state, never dismissible: incomplete preparation does not block
  advancement in general but does block crossing into the human's match. Space activates Continue
  where global shortcut handling is safe; function-key screen navigation stays out.
  **Continue becomes a persistent application-shell control, keeps its label, stops at every boundary
  `AdvanceCalendarResult` can report, renders one structured durable result per press, and refuses to
  cross into the human's match with invalid or absent required setup while never blocking advancement
  before that boundary.** See [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).
- `AdvanceCalendarResult` gains an explicit **nullable** pre-match boundary field carrying the pending
  Fixture, Matchday, opponent, home/away, and typed **Readiness Blockers** in the same vocabulary
  `startMatch` validation consumes. This applies rather than overrides the rule above — a stop must
  be exposed authoritatively before it can be a stop — and it is not the rejected always-true "human
  played" flag, because the field is genuinely null whenever an advance does not reach the human's
  Fixture. Readiness on the result is advisory; the boundary recomputes it on every read and
  `startMatch` stays authoritative. The surface renders in fixed order — what happened, what is next,
  what is unresolved, what you can do — with unresolved before actions, and a section with no
  authoritative typed data renders nothing at all. The renderer must not reconstruct boundary arrival
  or readiness from the current route, a fixture lookup, a null-Tactic check, or a before-and-after
  comparison.

**Readiness inventory**

- A fresh save has fixtures, budgets, contracts, a Board Objective and Condition 100 for all 500
  players, AI Tactics for 19 clubs, no user Tactic and no Training Focus rows — and nothing anywhere
  refuses to proceed. `startMatch` and `advanceCalendar` each silently substitute a machine-picked XI
  through two different fallbacks that disagree (`synthesizeDefaultTactic` hard-codes 4-4-2;
  `pickBestFormationTactic` chose 3-5-2 for the same squad), so both fallback uses go, and only the
  *fallback use* of the second may go since AI clubs still need the algorithm. The Tactics screen
  renders a null Tactic as an ordinary 4-4-2 with blank selects, indistinguishable from a saved one.
  No availability concept exists anywhere — injury severity only modulates recovery. Exactly one
  condition is unset-and-configurable (no Tactic / starting XI, blocking at the match boundary),
  which collapses the per-condition severity question: the readiness surface has exactly one thing to
  say in v1, so no severity taxonomy is built. Training Focus (unset) is informational, Condition 100
  is not a readiness condition, and squad depth is not a condition at all — generation guarantees
  cover at every Position, so no minimum-squad rule is invented. This audit produced facts, not a
  design decision, so it carries no Agent Note.

**The human's match**

- Continue advances to the human club's scheduled Fixture and stops before resolving any of that
  Matchday's ten Fixtures, persisted as nullable `season.awaiting_fixture_id` (plus
  `awaiting_match_id` linking the started stream) with `phase` unchanged. The stop *is* the readiness
  gate, so repeated Continue is safe structurally rather than by guard. After readiness passes the
  player picks Play or Quick result — the same `runSimulation`, the same `PersistedMatchStarted`
  stream, differing only by live reveal and command journal; the "two separate simulators" premise
  was false and is withdrawn. An explicit idempotent completion command commits the human result plus
  the other nine Fixtures in one transaction. Seeds derive from `SeasonStarted.seed` + `fixtureId`,
  killing a quit-and-retry re-roll; `synthesizeDefaultTactic` is deleted and `getTacticForClub`'s
  fallback removed for every club; `startMatch` becomes Fixture-bound and the free-opponent exhibition
  surface is deleted. Onboarding owns this contract; the cm-clone match effort owns delivery.
  **Continue stops at a persisted pre-match boundary before resolving any of the human's Matchday; the
  player then chooses Play or Quick result, both running the same simulation through the same match
  stream, committed by an explicit idempotent completion command.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).

**Contextual help**

- Help is a typed projection of the simulation model: a mechanical claim is permitted only where it
  traces to authoritative data, derived state or resolver output, with presentation templates free to
  make that readable but never to add mechanics, strategy or causality. The knowledge floor is the
  game's own model, never real football. Displayability follows provenance: `firstTouch` and
  `determination` leave player-facing screens (read by nothing), while `bravery`, `aggression`,
  `agility` and `naturalFitness` stay, explained by collision, injury and Condition rather than by
  ratings. One focusable **Term Disclosure** carries meaning; decision-critical values (Role Rating,
  Position, Condition) stay inline; no modals, no hover-only, no tapering and no per-save help state.
  Outcome-specific causal claims require structured resolver output — a Pillar value is never
  evidence. One bounded **Irreversibility Disclosure** exception covers the un-retryable match seed at
  the pre-match boundary. Labels and provenance live in `packages/shared` as exhaustive typed
  registries so drift fails `check:all`. Onboarding delivers Squad, Tactics, Transfers, creation and
  boundary help; Match day and Training help go to their own efforts.
  **Contextual help is a typed projection of the simulation model: help may make a mechanical claim
  only where that claim traces to authoritative game data, derived state, or structured resolver
  output, with one bounded Irreversibility Disclosure exception; it teaches the game's model rather
  than real football, never tapers, and is delivered through one keyboard-reachable Term Disclosure
  with decision-critical values kept inline.** See [Agent Note](../../.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md).

**Training Focus**

- A player-reachable Training Focus surface is required for onboarding-complete v1 — Technical
  Coaching is the only Pillar whose input the player must supply — delivered as an editable
  per-player column on Squad, owned by onboarding because the Training effort is closed with UI out
  of scope and cm-clone excludes Training. No seventh screen, and cm-clone is not reopened. **None**
  is a first-class named value and never a readiness blocker; the option set offers only Categories
  that can affect that player, so Goalkeeping is a silent no-op for outfielders and is withheld,
  enforced at the command boundary too. Development reads the standing Focus live at
  `SeasonConcluded` — no duration, history or partial credit — and the disclosure says so. Updates
  are confirmed, rendering `TrainingFocusView.focus`; `SaveSackedError` delegates globally.
  `technicalCoaching` exists nowhere in the code, so the Technical Coaching clause is gated on the
  Pillar entering the resolver, and because the focused fraction (0.975) accelerates decline past the
  age-ceiling, no copy promises improvement. The Training domain stays authoritative for Focus
  semantics, `setTrainingFocus`, persistence and Player Development; onboarding owns only the
  renderer integration.
  **Training Focus becomes an editable per-player column on Squad, owned by onboarding, and a Manager
  Pillar Binding must be player-reachable to satisfy the creation contract.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-training-focus-squad-column.md).

## Testing Decisions

**What a good test looks like here.** Tests exercise external behavior at a service or command
boundary — inputs in, returned view/result and persisted state out — never internal helpers, SQL
statements, or React component internals. A test that asserts "a fresh career has no Tactic" is good;
a test that asserts `synthesizeDefaultTactic` was not called is not. Where a decision above is
phrased as an invariant ("nothing refuses to proceed" becoming "the human's Fixture never resolves
with absent setup"), the invariant is the assertion.

**Two existing seams, no new ones.**

1. **The main-process career surface** (`apps/desktop/test`), driven over a temp saves directory
   exactly as `saves.test.ts` and `season.test.ts` already do: create or begin a career, call the
   shipped functions, assert on their returned views and on the resulting stream events. This is the
   dominant seam and covers nearly all of this spec — `beginCareer`/`commitCareer`/`discardCareer`,
   club commitment by `clubId`, the `manager_profile` row and Pillar Distribution snapshot,
   `advanceCalendar`'s boundary field and Readiness Blockers, boundary persistence and idempotent
   completion, seed derivation, and `setTrainingFocus` applicability rejection. Prior art:
   `saves.test.ts` for the create-and-inspect shape, `season.test.ts` for advancing the Calendar and
   reading the season stream back, `aiClubs.test.ts` for the assertion that the user's club gets no
   Tactic, `sackedGuard.test.ts` for a command-boundary refusal.
2. **The pure `packages/shared` seam** (`packages/shared/test`), for anything with no database in it:
   `selectBestFormationXI` and the Squad Quality band thresholds, and the exhaustiveness of the help
   label and provenance registries. Prior art: `ratings.test.ts`, `board.test.ts`,
   `development.test.ts`.

**Deliberately not new seams.** No renderer test seam is introduced. Everything that would need one —
boundary arrival, readiness, help provenance, Training Focus eligibility — is pushed below the
renderer as typed data by the decisions above, precisely so it is testable at seam 1 or 2. The
renderer's remaining job (rendering typed data in a fixed order) is covered by the map's deferred
E2E work, in the shape the wave-1/wave-2 specs established, not by a new unit-test boundary.

**Specific high-value assertions.**

- Determinism: the same `SeasonStarted.seed` and `fixtureId` produce the same match timeline across
  a simulated quit and reload.
- Idempotence: calling the completion command twice commits one set of results; pressing Continue
  repeatedly at the boundary changes nothing.
- Refusal: with no Tactic, no path resolves the human's Fixture — assert on `advanceCalendar` *and*
  the match-entry command, since the two fallbacks that made this pass silently are both being
  deleted.
- Exhaustiveness: the help registries fail `check:all` when a term or Attribute is added without
  provenance. Registry drift is a lint/typecheck failure, not a runtime one.
- `selectBestFormationXI` is **partial**: its failure mode (a squad too small to fill any formation)
  belongs to the `aiClubs.ts` wrapper as `SquadTooSmallError`, and the pure function's tests assert
  the partiality rather than a total contract.

## Out of Scope

- **World configuration** — nation/league selection, full-detail toggles, a world seed,
  squad-generation variance. A seed is genuinely useful, but it serves testing and world-sharing, not
  onboarding; it belongs to whoever owns world generation.
- **Manager reputation gating which clubs you may take.** A career-progression feature wearing an
  onboarding costume.
- **A scripted first-run tutorial** — overlay sequences, forced click-throughs, a staged first week.
- **A news/message feed** — a message entity, an event→message projection, a `messages` table,
  read/unread state, or an RPC method returning messages. Not to be reopened from the seed doc. A
  career-history log is a separate feature owned by whoever owns the long-run career loop.
- **Ruleset versioning for deterministic replay.** The Pillar Distribution snapshot protects replay
  from a change to the manager's Distribution; it does not protect against changes to the tactical,
  Condition, injury or development *formulas*. A feature-local `managerPillarRulesVersion` was
  specifically rejected as incomplete protection implying false safety. Needs its own ADR, owned by
  whoever owns simulation determinism.
- **Real-world data packs, multiple leagues, multiple simultaneous saves.** Settled in cm-clone's v1
  scope.
- **Historical league state** — a previous-season table, last-season finishing positions,
  promotion/relegation history. Generating real history is a world-model feature.
- **A universal numeric difficulty rating** for a club.
- **Archetype-club synergy bonuses or incompatibility penalties**, and any UI naming an optimal
  Archetype for a club. No shipped Pillar binding varies by Stature Tier.
- **Friendly / exhibition matches.** The shipped free-opponent Match day surface is deleted, not
  preserved as an undocumented shortcut. A real friendly feature may return later with its own
  decisions on scheduling, home/away, Condition and injury effects, statistics and career history.
- **Abandoning a started match, and any bulk "advance several Matchdays" affordance.** Once
  `PersistedMatchStarted` exists the setups and seed are authoritative, so navigation and restart
  resume rather than restart; a bulk path would reopen the boundary's exactly-once guarantees.
- **Starting unemployed, multiple simultaneous human managers, and mid-creation regeneration of
  individual clubs.** All three redraw what a save *is*.
- **Per-screen purpose blurbs** — authored prose whose only job is to say what a screen is for.
  Derived empty states reporting authoritative current state remain in scope; the line is state
  versus purpose.
- **Tapering, dismissible, or first-career-only help**, and any per-save help state.

## Further Notes

**Carried forward, unresolved — none blocks implementation, none may be silently designed around.**
Each should surface as its own follow-up ticket when picked up.

- **Per-Binding magnitude and tuning.** The five binding sites and their permitted dimensions are
  fixed; no numbers are. Plausibly one ticket per bound system, under the two invariants stated above.
- **AI manager assignment and AI manager Archetypes.** Whether AI managers have Pillars at all, how
  they would be assigned, whether AI-vs-AI fixtures consume them. Deliberately left undecided rather
  than scoped out: no ticket may implement them or introduce a default (a placeholder 3/3/3/3 would
  settle this by accident).
- **Whether Manager Pillars change over a career.** Ticket 01 assumed immutability, and three of its
  conclusions rest on it — the not-a-Decider argument, the no-snapshot determinism guarantee, and
  plain-row persistence. If this ever resolves to "yes", all three reopen together.
- **Scouting integration contract**, to be delivered durably into `.scratch/scouting/`. Scouting must
  accept Tactical Acumen as an immutable manager input affecting information quality, confidence or
  interpretive accuracy — never replacing Scout capability, revealing ground truth, or gating
  permission. The exact effect is Scouting's to choose.
- **Training model corrections**, recorded into [`.scratch/training/spec.md`](../training/spec.md)
  against a closed effort. (i) The **orphaned-Attribute** defect: `developPlayer` develops every entry
  in `ALL_ATTRIBUTES` while a Focus biases a whole Category, so Technical or Mental focus spends part
  of its multiplier on `firstTouch` and `determination`, which nothing reads and which help removes
  from player-facing screens — give them a shipped consumer or exclude them from focus allocation.
  (ii) **Focus-accelerated decline**: the focused fraction is 0.975 against 0.65, so where the
  age-ceiling sits below the current value (Physical past 30) Focus accelerates the loss — accept it
  and amend the spec, or stop applying the multiplier to a negative gap. Onboarding may not change
  development behaviour to fix either, and until they resolve no onboarding copy may overstate the
  visible payoff of Training Focus or Technical Coaching.
- **Training Focus applicability at the command boundary.** The rejection rule is a behaviour change
  to a shipped, tested Training command, not a renderer concern. Whether eligibility is derivable
  from `SquadPlayerView`, how pre-release saves holding a `goalkeeping` focus on an outfielder are
  normalized, and what the error is named are for whoever delivers the column.
- **AI Fixture seed persistence.** AI-vs-AI Fixtures draw an unrecorded seed in `resolveFixtureScore`
  and persist only their final score, so their timelines cannot be reproduced from event history.
  Predates this effort and is distinct from ruleset versioning: seed persistence concerns recording
  simulation *inputs*, ruleset versioning the *transformation*. Owned by whoever owns simulation
  determinism.
- **Save-list read model.** The row's primary identity is Manager · Club · Season, but not what backs
  the rest. There is no last-played timestamp and no season *year* label (v1 renders "Season 1"; a
  calendar label would imply a chronology the schema does not contain). Nothing may show or sort by
  "last played" until this resolves, and filesystem modification time must not silently become a
  domain-level last-played value.
- **Optional save label: schema and compatibility.** `save_meta.name` is `NOT NULL` on every save
  already written. Until a schema-change decision, the name stays stored and required, and an empty
  string must **not** be overloaded to simulate optionality.
- **Provisional-save cleanup after abnormal termination.** The normal path is settled by
  `discardCareer`; process kill, OS crash, power loss and storage failure are not. No ticket may
  establish a startup garbage collector as a side effect of implementing the creation flow.
- **An honest generation-progress measure.** A determinate `14 of 20 clubs` count is permitted only
  when the unit means a club fully ready for selection; otherwise the wait is indeterminate. Squad
  Quality reads only the generated squad's Position Ratings and needs no economy data, but the panel
  still shows both budgets, so the economy remains part of the unit. Whether `generateWorld` and
  `initializeSeasonEconomy` can expose such a measure is a generator question, and the flow is fully
  specified either way.
- **How much of the Bid/valuation model Transfers exposes numerically.** Exact seller thresholds are
  permitted on provenance grounds, but whether they sit inline, behind a Term Disclosure, or stay
  qualitative is undecided. The screen may not imply that seller responses are mysterious or
  personality-driven when they are a deterministic threshold shifted by Influence.
- **The other Irreversibility Disclosure candidates.** Season conclusion, save deletion and the
  immutability of creation-time Pillars each look like candidates, but each needs its own ticket to
  confirm the actual irreversibility first — the exception is not a licence to warn about ordinary
  mutations.
- **Variable squad composition, and any future Squad Depth measure.** `SQUAD_COMPOSITION` gives every
  club the same 25 players in the same positional shape. Whether generation should vary squad size,
  cover or reserve quality is owned by whoever owns the generator; that variation is the prerequisite
  for any future Depth field, and a better depth *formula* is not (the strongest candidate measured
  at 2.0–2.3 rating points across all three tiers). **No onboarding ticket may change
  `SQUAD_COMPOSITION`.**
- **Availability-aware XI quality.** Squad Quality is structural, with no availability filtering,
  because no availability concept exists anywhere. Any future currently-available measure takes a
  **distinct name** (*Available XI Quality*, *Current Selection Strength*) and never silently changes
  what Squad Quality means.
- **In-career league-wide Squad Quality comparison.** The band is selection-only for v1. A future
  cross-club comparison needs an owning effort, must preserve the structural-versus-available
  distinction, and does not belong on the League Table by default merely because that screen already
  compares clubs.
- **E2E coverage for the onboarding flow**, in the shape the wave-1/wave-2 specs established.

**Delivery boundaries.** Onboarding owns the contract for the pre-match boundary but the cm-clone
match effort owns its delivery. Onboarding owns the Training Focus renderer integration; the Training
domain stays authoritative for Focus semantics and Player Development. Onboarding delivers help for
Squad, Tactics, Transfers, creation and the boundary; Match day and Training help go to their own
efforts.

**Seed document.** [docs/game-onboarding.md](../../docs/game-onboarding.md) is a reference, not a
target: keep the simulation-first spine (immediate agency, event-driven learning, useful defaults, no
scripted tutorial) and treat its section 13 ("What made it difficult") as a list of problems to solve
rather than reproduce. Its section 2 (nations, leagues, full-detail toggles) is structurally
inapplicable to a single fictional league with a fixed 20-club world.
