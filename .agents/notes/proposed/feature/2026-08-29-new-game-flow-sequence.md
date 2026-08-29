# Agent Note: New-game flow sequence and screens

Status: proposed

## Problem

The path from launching the app to standing in a club with a career underway has no defined shape.
Today the whole of it is a text field and a button in `apps/desktop/src/renderer/App.tsx`: type a
save name, press create, and `createSave` does everything in one call.

Three prior decisions each landed a piece of the new flow without anyone assembling them. Manager
creation must collect a manager name and a Manager Pillar Distribution, submitted once and
atomically ([Manager Pillars & archetype set](2026-08-29-manager-pillars-and-archetypes.md)). Club
selection must read persisted budgets, squads, and contracts, which forces the complete league to be
generated before the player chooses
([Club selection at new game](2026-08-29-club-selection-at-new-game.md)). Arrival cannot be
announced by a welcome message, because no message entity exists to put one in
([No onboarding inbox](../architecture/2026-08-29-no-onboarding-inbox.md)).

What remained open was the assembly. In what order do manager creation and club selection run, given
both must follow generation? Is creation one screen or a sequence, and can the player revise an
earlier step before committing? Where does the 20-squad generation wait fall, and what is on screen
while it runs? What is the player looking at the instant the career begins? And what does a returning
player starting a second career walk through, given they should not have to read anything?

## Proposal

Creation is a **three-step sequence with the manager first**: Manager, then Club, then Review, with
a step rail that allows free return to any already-reached step. World generation starts the moment
the player commits to a new career and runs **underneath the manager step**, so the wait is spent
making the first real decision rather than watching a progress bar. Nothing is written as a playable
career until Review's final action. Arrival is the **Squad screen**, with the Board Objective added
to the persistent shell identity and no arrival ceremony of any kind.

Three variants of the full path were prototyped and driven end to end before this was settled; see
[Prototype](#prototype).

### Creation lifecycle: `beginCareer` and `commitCareer`

Masking the generation wait behind manager creation means the world reaches disk before the manager
is submitted. `createSave` — which today performs DDL, inserts `save_meta`, generates the world, and
starts the season in a single call — splits into two explicit lifecycle operations.

**`beginCareer`** creates the provisional world that informed club selection requires. It allocates a
provisional save identifier and file, creates the schema, generates the complete neutral world,
initializes the season economy for all twenty clubs, and returns the provisional identifier together
with the generated club summaries.

It deliberately does none of the following: insert `save_meta`; insert `manager_profile`; select or
mark a human-controlled club; create a Board Objective; create `manager_status`; assign AI Tactics
under the human-club exception; start the season. The provisional database holds authoritative
generated state, but it is not yet a career.

**`commitCareer`** takes the completed configuration — the provisional save identifier, manager name,
archetype origin, Pillar Distribution, selected club id, and the optional save label — and atomically
turns the provisional world into a playable career. In one transaction it validates the provisional
world, validates that the selected club belongs to that world, validates the Pillar Distribution,
inserts `manager_profile`, assigns the human club, creates that club's Board Objective, creates
`manager_status`, assigns AI Tactics to the remaining clubs, starts the season, and inserts
`save_meta` last. Ordering within the transaction may follow foreign-key or domain dependencies, but
`save_meta` must never become visible outside a successfully committed career.

The corrected invariant is therefore: **a world may exist provisionally before the manager is
submitted, but the transition from provisional world to playable career is atomic.** A career must
never be visible with no manager profile, no selected club, more than one user club, uninitialized
human season state, an invalid Pillar Distribution, or a partially committed configuration.

This is safe because `listSaves` reads `save_meta` through `Effect.option` and discards anything that
fails to decode, so a `.sqlite` file with no `save_meta` row cannot appear in the save list. Why
generation must precede selection at all is argued once, in
[Club selection at new game](2026-08-29-club-selection-at-new-game.md), and is not restated here.

#### Supersession of the manager-pillars note

[Manager Pillars & archetype set](2026-08-29-manager-pillars-and-archetypes.md) states that
`manager_profile` is written inside `createSave`'s existing transaction, alongside world generation.
That statement is **superseded**: `manager_profile` is now written by `commitCareer`, which no longer
contains world generation. Its acceptance criterion — that a failure to write the profile aborts
creation, so no save can exist without exactly one `manager_profile` row — survives intact, because
`commitCareer` is still a single transaction and `save_meta` is still written inside it.

Everything else in that note remains authoritative: the Pillar model, validation, `archetype_origin`,
the absence of a Manager Decider, and the absence of a `ManagerCreated` event. This is a lifecycle
correction, not a reopening of the Manager Pillar model.

### Order: manager before club

Manager creation runs first. The decisive argument is not thematic but temporal: the generation wait
has to go somewhere, and the manager step is the only step in the flow that does not depend on the
generated world. Manager name, Archetype, and Pillar allocation are answerable with no knowledge of
any club, so they can be answered *while* the league is being built. Putting club selection first
would leave nothing to do during generation except watch it.

The club-first alternative was prototyped and does read well — being hired by a named club and then
being asked who you are has a pleasing narrative order. It was rejected because it converts the wait
into a foregrounded ceremony that the player must sit through before touching anything.

### Screen count and revision

Three steps, not one combined screen and not a longer sequence. The step rail shows all three, marks
the current one, and allows clicking back to any step already reached. Returning to the manager step
after generation has completed requires no regeneration: nothing in world generation consumes the
manager, so manager name, Archetype, Pillar Distribution, and save label can all be revised freely
inside a single active creation flow.

The Review step is retained rather than replaced by a live summary bar. A single-screen configurator
with a continuously-updating footer was prototyped as the alternative and rejected: it makes the
final commitment indistinguishable from every intermediate edit, and the commitment is exactly the
moment that deserves a deliberate stop.

Nothing is persisted as a career until Review's action fires. The plus and minus clicks remain
provisional UI state, consistent with the manager-pillars note.

### Generation gating and progress

The player cannot enter club selection until every club is ready for authoritative comparison. The
transition control stays disabled, and **must state why** — a silently greyed button is not
acceptable. The disabled action reads as its own explanation, for example a `Choose a club` label
subtitled `Building the league first…`, or an adjacent line carrying the same fact.

Numerical progress such as `Building the league… 14 of 20 clubs` may be shown **only** when the
reported unit means a club that is fully ready for selection: generated club, generated squad,
initialized economy, and whatever else club selection needs to render its detail panel and derive
squad quality. A count that advances when club rows exist but squads and economy do not is a lie
about readiness. Where no honest measure exists, show an indeterminate `Building the league…`.
Progress must never be simulated in the renderer.

Clubs must never appear progressively as they generate. Doing so would let the player compare clubs
whose inputs are at different completion stages, producing missing budgets, incomplete squads,
incorrect squad-quality labels, reordering under the cursor, a detail panel that changes after the
choice, and the possibility of selecting a club whose generation later fails. Club selection operates
on a complete and stable comparison set or it does not open.

If generation fails, the progress state is replaced by an explicit failure with **Retry** and
**Cancel** actions, never a permanently disabled transition. Retry discards or safely replaces the
failed provisional state; it must not layer a second attempt onto a partially generated world unless
generation is explicitly designed to be resumable.

### Arrival

On successful commitment the player lands on the **Squad screen**, with no intervening screen,
transition, or acknowledgement.

Squad is the right landing because it answers what the player most needs to know first: which players
they inherited, which positions are strong or thin, who is injured, and what Condition the squad is
in — the raw material for the first tactical decision. Landing on Tactics was prototyped and
rejected: it presents an unset task before establishing what is being managed. The requirement to set
a Tactic before the first match is already carried by the persistent readiness affordance defined in
[Continue as the global career loop](2026-08-29-continue-as-global-career-loop.md), so Tactics does
not need to be the landing screen for that requirement to be visible.

The **Board Objective joins the persistent shell identity**, beneath or beside the existing
Manager · Club · Season line:

```
Ada Whitlock · Ridgeway Town · Season 1
Board objective: Finish between 15 and 20
```

This is compatible with the no-inbox decision precisely because it is standing state: true from the
first day of the season, relevant throughout it, never dismissible, and not a notification. It is not
a welcome strip and carries no arrival-specific content.

The shell must not grow beyond this. The stable hierarchy is primary identity (Manager · Club ·
Season) and standing mandate (Board Objective). Budgets, league position, squad quality, and the
Manager Pillar Distribution stay on the screens that own them; the shell is not a statistics panel.

### Cancellation and provisional cleanup

The provisional database is deleted when the player explicitly cancels creation, closes the creation
flow, closes the application window during creation where a normal shutdown path runs, or hits an
unrecoverable creation-flow failure.

Cleanup is a distinct idempotent operation — `discardCareer(provisionalSaveId)` — safe to call more
than once. If the file exists it is deleted; if it is already absent the call succeeds; if deletion
fails the failure is recorded and the save remains invisible. **A provisional career must never
become visible merely because deletion failed**; the absence of `save_meta` preserves invisibility
independently of whether the file survives.

A cancelled provisional world is **never reused** for a later creation session. Every `beginCareer`
generates fresh. Reuse would silently hand two different careers the same league, which reads as a
bug the moment a player notices, and it couples two creation sessions that the player believes are
independent.

### Returning player

A returning player sees a save list keyed on Manager · Club · Season, per the club-selection note,
and a New career action beside it. The three creation steps are the same steps in the same order, and
none of them require reading anything: the Archetype presets carry their own one-line descriptions,
and a player who already knows what they want passes through by picking a preset, picking a club, and
committing. No first-run-only content exists anywhere in the flow, so there is nothing for a second
career to skip.

## Prototype

Three structurally different variants of the whole path — launch, creation, arrival — were built as a
throwaway Vite route and driven end to end against the real twenty clubs, real Stature Tiers, real
per-tier budgets, and the real Archetype distributions. Variant A (stepper, manager first, generation
masked) won; variant B (club first, generation as a full-screen ceremony) and variant C (one dense
screen with a live review bar) lost for the reasons recorded above. The Board Objective in the shell
is variant B's contribution, carried over rather than discarded.

The prototype is throwaway and is not the spec. It is captured on the `prototype/newgame-flow`
branch, out of the main branch; the ticket carries the context pointer.

## Alternatives considered

- **Club first, with generation as a foregrounded ceremony.** Prototyped in full. The league builds
  on a dedicated screen with clubs listing as they complete, then the player picks a club and is
  asked who they are. Genuinely attractive, and closest to the seed doc's Championship Manager 03/04
  opening. Rejected because it makes the player wait through a bar before touching anything, where
  the manager-first order makes the same wait invisible. Its persistent objective strip was kept.

- **A single dense configurator with a live review footer.** Prototyped in full: manager and club
  side by side, no steps, no order, no back button, and a sticky bar that doubles as the review.
  Rejected because it erases the distinction between editing and committing, and because it
  contradicts the separate review step that club selection specified — a step which, tested against
  the alternative, earned its place rather than merely being inherited.

- **Landing on Tactics rather than Squad.** Rejected: it opens the career on an unset task before the
  player knows what they are managing, and the readiness affordance already communicates that a
  Tactic is required before the first match.

- **Keeping `createSave` atomic by generating during the review step.** Rejected: it puts the entire
  wait after every choice has been made, at the point of highest impatience, and club selection could
  not then read persisted budgets — which breaks club selection outright.

- **Generating the world at application launch, before New career is pressed.** Rejected: it performs
  speculative work on every launch, including for the overwhelmingly common case of a player who
  opened the app to resume an existing career.

- **Showing clubs progressively as they generate, or opening a greyed club list.** Rejected: the
  first allows comparison across inconsistent completion states, the second relocates the same wait
  to a worse screen without shortening it.

- **Reusing a cancelled provisional world for the next creation attempt.** Rejected: it hides
  coupling between two creation sessions and violates the expectation that a new career means a new
  world.

## Acceptance criteria

- World generation and career commitment are separate lifecycle phases: `beginCareer` and
  `commitCareer`.
- A provisional world contains no `save_meta` row and does not appear in `listSaves`.
- `commitCareer` atomically produces a valid playable career from a provisional world, writing
  `save_meta` inside the same transaction as `manager_profile`, the human club assignment, the Board
  Objective, `manager_status`, AI Tactic assignment, and season start.
- The manager-pillars note's world-generation atomicity statement is marked superseded and
  cross-linked to this note.
- Creation is three steps — Manager, Club, Review — with return to any already-reached step, and no
  regeneration on return.
- Generation begins when the player commits to a new career and runs during the manager step.
- Club selection cannot be entered until every club is ready for authoritative comparison, and the
  disabled transition always states that generation is still running.
- Numerical generation progress appears only when its unit is a fully selection-ready club; otherwise
  the state is indeterminate. Progress is never simulated in the renderer.
- Clubs never appear progressively during generation.
- Generation failure offers Retry and Cancel rather than a permanently disabled transition.
- After successful commitment the first screen is Squad, with nothing between commitment and it.
- The persistent shell shows Manager · Club · Season and the current Board Objective, and no more.
- The Board Objective is standing state, never dismissible and never a notification.
- Cancel and normal creation-flow shutdown attempt to delete the provisional database, through an
  idempotent operation whose failure never makes a provisional career visible.
- A cancelled provisional world is never reused for another creation session.

## Risks

- **The split multiplies the states creation can fail in.** One call becomes two plus a cleanup
  operation, and the window between them is owned by the renderer. A renderer crash between
  `beginCareer` and `commitCareer` leaves an orphan file that normal cancellation would have removed.
  This is knowingly accepted and bounded: the orphan is invisible, costs disk only, and abnormal
  termination is explicitly left unresolved rather than silently handled.
- **No startup garbage collector is established here, deliberately.** Detecting stale provisional
  files, deciding their age, whether they are swept automatically, whether incomplete creation can be
  resumed, how they are distinguished from corrupted committed saves, and whether scanning happens at
  startup or at the next `beginCareer` are all left open. Implementing any of it as a side effect of
  this flow would settle a policy question by accident.
- **The honest-progress rule may force an indeterminate spinner.** If the generator exposes no
  measure that corresponds to selection-ready clubs, the flow shows an unquantified wait, which is a
  worse experience than a count. That is accepted: an accurate unquantified wait beats a count that
  misrepresents readiness, and adding an honest measure is a generator change, not a UI one.
- **Masking the wait only works while the manager step is slower than generation.** On a fast machine
  the gate never appears; on a slow one, or if generation grows more expensive, the player finishes
  the manager step and waits anyway — at which point the flow degrades to a variant of the ceremony
  it rejected. The explicit disabled-state explanation is what keeps that degradation legible rather
  than confusing.
- **Board Objective in the shell invites further additions.** Every subsequent decision will have a
  candidate for "standing state that belongs in the shell". The two-line hierarchy is stated as a
  constraint precisely because the pressure to widen it is predictable.
