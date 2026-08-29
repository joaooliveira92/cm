# Agent Note: Continue as the global career loop

Status: proposed

## Problem

The seed doc calls understanding the Continue loop the most important onboarding milestone: read what
happened, follow a link, decide, adjust, press Continue, respond to the next event. Our counterpart
is `advanceCalendar`, and it ships as a button in the header of the League table screen
(`apps/desktop/src/renderer/LeagueTableScreen.tsx`). The game's primary rhythm control sits on a
secondary screen, reachable only by first navigating somewhere unrelated to it, which makes the
League table the de facto owner of time.

[No onboarding inbox](../architecture/2026-08-29-no-onboarding-inbox.md) removed the alternative
answer to every question that follows. With no message feed, "an unread message exists" is not
available as a stop condition, so each interrupt needs its own ruling; and the transient half of the
notification load lands on whatever renders at the point of the press, making the Continue result
load-bearing rather than a detail. That note's own stated risk is that this gets rendered thinly and
the player ends up with less than either design would have given.

Four questions follow. Where does the control live. What does it stop for, given that the candidate
set is now exactly the fields on `AdvanceCalendarResult`. What does it do when the manager has not
done something required — the human's club starts with no Tactic at all and nothing in the game says
so. And is there a keyboard binding, the seed doc's space bar having done double duty that only half
of which survives.

## Proposal

**Continue becomes a persistent application-shell control, keeps the label "Continue", stops at every
boundary `AdvanceCalendarResult` can report, renders one structured durable result per press, and
refuses to cross into the human's match with invalid or absent required setup while never blocking
advancement before that boundary.**

The absence of an inbox makes Continue more important, not less: it is now the single stable control
connecting distributed attention state, calendar advancement, and the next required action.

### Placement

Continue moves out of `LeagueTableScreen` and into the shared navigation shell in
`apps/desktop/src/renderer/App.tsx`, alongside the existing screen tabs. It must be visible from every
primary management screen, consistently located, reachable by keyboard, independent of the current
route, able to display readiness state and in-progress advancement, and disabled against duplicate
presses while an advance is pending.

Screen-bound Continue is wrong because it asserts four things the domain does not say: that the League
table owns time, that the player should visit the table before every advance, that calendar
progression is secondary, and that navigating to an unrelated screen is part of the core loop. The
loop is inspect state → decide → Continue → simulation advances → consequence appears → inspect
changed state, and it belongs to the career, not to a screen.

The League table keeps showing standings, season progress, and the effect of the last resolved
Matchday. It stops being the unique place from which time advances.

The shell must also carry temporal orientation, because today the Season/Matchday/phase line is
rendered only in the League table header and from any other screen the player cannot tell where in the
Season they are. The shell should answer: what phase am I in, what is the next Matchday, is the
Transfer Window open, is anything blocking match readiness. Continue need not contain all of this
itself, but it must sit beside an application-level status surface that does.

**Copy must never express time in days or dates.** CONTEXT.md's Calendar entry fixes that the career
has no day-by-day clock and advances only by jumping to the next scheduled event; `nextCalendarBoundary`
implements exactly that. "Next match in 4 days" and any dated label describe a chronology the schema
does not contain. The unit is the Matchday.

### Label

The player-facing label stays **Continue**, not "Advance Calendar", "Simulate", "Next Day", "Progress",
"Run", or "Proceed". "Continue" names the player's intent — *I have finished what I want to do here;
continue the career until I need to care again* — where the alternatives name the implementation.
`advanceCalendar` stays the RPC and command name, and **Calendar** stays the domain term; the label is
an affordance, not a vocabulary change.

The control may carry secondary text naming the next known destination ("Continue to Matchday 7") but
the primary label does not vary by screen. Consistency beats a few saved words of explanation.

One collision to clear: `App.tsx` already heads the save list "Continue career" with a per-save button
that resumes a save. That is a different continue. The save-list affordance gets a different word
(Load) so "Continue" means exactly one thing in the product.

### What Continue advances toward

One press advances to the next interrupt-worthy boundary. The shell orchestrates, repeating the
underlying call if it must, bounded and protected against duplicate invocation; the domain operations
are not to be reshaped merely to imitate one long simulation call when repeated deterministic calls
already produce the correct result.

**In v1 that loop never actually repeats, and this should be understood rather than designed around.**
`nextCalendarBoundary` emits exactly three boundary kinds — `matchday`, `windowOpen`, `seasonComplete`
— and under the stop policy below every one of them is interrupt-worthy. One press is one boundary is
one stop. The repetition machinery is a forward-compatible statement of intent, not v1 behaviour, and
must not be built as speculative infrastructure.

### Interrupt classification

The stop set is exactly the fields `AdvanceCalendarResult` already returns. Each is a stop:

- **`resolvedMatchday`** — a Matchday including the human club's Fixture is a major career boundary and
  must never pass silently. The result carries opponent, final score, home/away, League-table impact
  where available, any injury or availability consequence the existing result path preserves, and a
  direct action to the owning surface.
- **`transferWindowOpened`** — stops, because the set of legal actions changes. Informational, never
  blocking; links to Transfers.
- **`transferWindowClosed`** — stops, because the closure removes actions and may strand unfinished
  plans. The copy describes only what the shipped rules do, and does not offer a Transfers action that
  implies the player can still act when the domain forbids it.
- **`seasonConcluded`** — stops and routes to Season summary. Continue must not move into a following
  Season before the Season summary has at least been made available.
- **`boardObjectiveVerdict`** — stops. An authoritative judgment of the manager's performance is not a
  line tucked beneath another notification.
- **`managerOutcome`** — stops, at the highest presentation priority, because it can change whether the
  career continues in its current form.

Presentation priority when several arrive together: manager outcome, board verdict, season conclusion,
human Matchday result, Transfer Window transition. This orders the display; it never licenses dropping
a lower-priority field.

**The human-versus-AI Matchday distinction is vacuous in v1 and must not be built.** The rule stands as
a principle — an AI-only Matchday would not interrupt on its own — but the League is 20 clubs playing a
double round-robin, so every Matchday resolves all 10 Fixtures and the human's club plays in every one
of them. There is no AI-only Matchday to pass silently over. Adding a typed always-true "the human
played" flag to `AdvanceCalendarResult` to express this would be a field that can never be false,
carrying no information and inviting a renderer branch that is dead on arrival. If a Fixture structure
ever exists where the human's club can sit out a Matchday, the distinction gets added then, as typed
authoritative data and never inferred from display text.

### One press, one result surface

Every consequence returned by a single advance renders in one structured Continue result, not a chain
of toasts. The surface states why Continue stopped, groups related consequences, preserves every
interrupt-worthy field, provides direct navigation to owning screens, and remains inspectable until
deliberately dismissed or acted on. A short-lived snackbar is insufficient: this surface now carries
the transient half of the notification system that the inbox decision distributed.

The exact component is ticket 08's; acceptable forms include a persistent result panel, a structured
dialog, an application-level activity panel, or a non-modal drawer that survives until acknowledged.

**This surface is not an inbox and must not grow into one.** No message persistence, no read/unread
state, no chronological history, no deletion, no pagination, no universal event projection. It
represents the result of the most recent Continue and nothing else; after acknowledgement, durable
consequences remain visible on the screens that own them.

### What passes silently

Anything not represented in `AdvanceCalendarResult` cannot interrupt Continue. Individual injuries,
Condition changes, Training progress, Player Development before Season conclusion, squad changes,
League-position movement on its own, and generic advancement all pass, and remain visible on their
owning screens when the player arrives.

The consequence is a constraint on copy: **the UI must never claim "Continue stops whenever something
needs your attention."** That is false under the current contract. The honest promise is narrower —
*Continue stops at major career boundaries and before required match preparation.* If a transfer
response should become a stop later, `AdvanceCalendarResult` must expose it authoritatively first; the
renderer must not infer it by diffing before-and-after snapshots.

### Readiness, and the match boundary

The human club begins with no Tactic, so the unprepared state exists from the moment the save is
created. Readiness is a **derived state** displayed persistently in the shell while its predicate holds
— never a notice that is marked read or dismissed, because dismissal does not resolve the condition.

Blocking is **boundary-aware**. Incomplete preparation does not block calendar advancement in general;
it blocks crossing into the human's match. This rejects both extremes. Disabling Continue from save
creation onward would gate the player behind a tutorial step while the first match is still several
Matchdays away, and would forbid the legitimate wish to bid, inspect the squad, advance while awaiting
a transfer response, or simply set tactics closer to kickoff. Allowing silent entry is worse: the match
must never begin or resolve on no Tactic, an illegal starting eleven, an invalid selection, or a hidden
fallback the player did not choose. At the boundary, advancement stops before kickoff, does not resolve
the match, keeps the readiness state active, lists every blocking condition, and routes to the owning
screens.

The seed doc's "not protected from failure" stance is preserved exactly, and the line it draws is
between two different things. A weak formation, an unbalanced selection, an exhausted but legally
selectable player, a risky transfer strategy, poor instructions — all valid, all allowed, consequences
land. Structurally invalid or absent required state is not failure the player chose. **The game permits
strategic failure, not accidental failure caused by undisclosed required state.**

Nor are all unset conditions equal. No legal starting eleven blocks at the match boundary if the engine
requires one. A thin senior squad is a strategic weakness, and Continue must not invent a minimum-squad
rule the domain does not have. Ticket 07 classifies each condition it finds as informational, warning,
action-required-before-a-later-boundary, or immediately blocking; this decision does not convert every
onboarding concern into a Continue blocker.

**This requires deleting shipped behaviour, not only adding UI.** `getTacticForClub`
(`apps/desktop/src/main/season.ts`) falls back to `pickBestFormationTactic` whenever no Tactic is
persisted. That fallback exists for AI-club robustness, but nothing branches on club identity, so today
the human's club is silently given a machine-picked tactic every Matchday. The same fallback sits in
`loadTeamSetup` (`apps/desktop/src/main/match.ts`) via `synthesizeDefaultTactic`. Under this decision
the fallback must not apply to the human's club: absence of a Tactic there is a blocking condition to
report, not a gap to paper over.

### Keyboard

Space activates Continue globally, wherever global shortcut handling is safe. It must not fire when
focus is in a text field or multiline editor, when a dialog or menu owns Space, when a selection
control expects Space as its activation key, when a Continue result is awaiting acknowledgement, or
while an advance is already running. This is ordinary accessibility behaviour: a global shortcut does
not steal input from a focused control.

The seed doc's space bar both continued the game and stepped through unread news; with no inbox, only
the first half exists. Repeated presses must not chain into dismiss-and-advance, because that is a path
for skipping consequences by holding a key. While a result is open, Space does not start another
advance; the result is acknowledged by an explicit action whose design belongs to ticket 08.

Function-key shortcuts to individual screens are a separable idea and stay outside this decision.

### Control state model

Continue exposes five explicit states:

- **idle** — available; may show next-Fixture proximity, readiness warning, current phase.
- **advancing** — disabled; shows progress, preserves the current route, prevents duplicate requests
  and any conflicting mutation the application cannot safely process.
- **stopped_with_result** — an interrupt-worthy result is returned and its structured surface is up.
- **blocked_before_match** — advancement reached the human match boundary with invalid preparation;
  lists blockers with direct navigation.
- **unavailable** — cannot advance because another authoritative transition is active or the career
  cannot progress. **This state must always explain itself; a disabled button with no reason is not
  acceptable.**

### Ownership

The shell owns orchestration only: invoking `advanceCalendar`, preventing duplicate requests, deciding
interrupt presentation, showing persistent readiness, and routing. Domain screens stay authoritative
for durable state, corrective actions, and clearing derived attention when the state changes. Ticket 08
owns the player-facing copy and presentation. The Continue result summarises and links; it must never
become a second implementation of Transfers, Squad, Tactics, League table, or Season summary.

## Alternatives considered

**Leave Continue on the League table screen.** Rejected: it makes navigating to an unrelated screen a
step in the core loop and implies the League table owns time. It also forces an arbitrary answer to
"which screen", since no screen has a better claim than any other.

**Rename the control to "Advance Calendar" (today's label), or to Simulate/Next Day/Progress.**
Rejected: those name the mechanism, and "Next Day" additionally asserts a day clock the Calendar does
not have. "Continue" is the genre convention the seed doc describes and names the player's intent.

**Block Continue outright whenever required setup is missing.** Rejected as overprotection: it would
disable the primary control from save creation, when the first match is still several Matchdays away,
and forbid legitimate use of the intervening time. It also makes Continue feel like a tutorial gate,
which the map rules out of scope.

**Advance regardless and let the consequence land, per the seed doc's "not protected from failure"
stance.** Rejected as a misreading of that stance, which concerns valid-but-poor decisions. Resolving
the human's match on a machine-picked fallback Tactic the player never saw is not a decision the player
made, so no lesson is available from the outcome.

**Add a typed human-played flag to `AdvanceCalendarResult` to distinguish human from AI-only
Matchdays.** Rejected for v1: the double round-robin guarantees the human plays every Matchday, so the
field could never be false. The rule is recorded as a principle to apply if the Fixture structure ever
changes.

**Render the Continue result as a transient toast.** Rejected: the inbox decision moved the transient
notification load onto this surface, and a snackbar that expires unread reproduces exactly the thin
rendering that note names as its own risk.

**A first-press-only or tapering readiness hint.** Rejected on the same ground the inbox note rejected
tapering guidance: help that stops once the player is judged experienced is a scripted tutorial step
regardless of the surface it sits on. Readiness is derived from a predicate and disappears when the
predicate is false, not when the player has seen it enough times.

## Acceptance criteria

- Continue is visible and operable from every primary management screen, owned by the application
  shell, and no longer owned by `LeagueTableScreen`.
- The player-facing label is "Continue"; `advanceCalendar` remains the operation name; the save-list
  "Continue career" affordance is renamed so the word means one thing.
- No Continue copy expresses time in days or dates; the unit is the Matchday.
- Each of the six `AdvanceCalendarResult` fields interrupts, and a single advance's consequences are
  preserved together in one structured surface that explains why advancement stopped and links to the
  owning screens.
- The result surface persists until acknowledged and is not rendered only as a transient toast.
- The result surface introduces no message persistence, chronological history, or read/unread state.
- The UI never claims to stop for events absent from `AdvanceCalendarResult`.
- No always-true human-played flag is added to `AdvanceCalendarResult`; if a human/AI Matchday
  distinction is ever needed it is typed authoritative data, never inferred from display text.
- Match-readiness state is visible for as long as its underlying condition is unresolved, and is never
  dismissible.
- Missing preparation does not block advancement before the match boundary, and does block crossing it,
  with every blocker explained and routed.
- No shipped path assigns the human's club a fallback Tactic: the `pickBestFormationTactic` fallback in
  `getTacticForClub` and the `synthesizeDefaultTactic` fallback in `loadTeamSetup` no longer apply to
  the user's club.
- Valid but strategically poor preparation is accepted; only invalid or incomplete required state
  blocks.
- Space activates Continue where global shortcut handling is safe, and never while typing, while a
  focused control expects Space, while a result awaits acknowledgement, or while an advance is running.
- Duplicate Continue requests are prevented, and the `unavailable` state always states its reason.
- Ticket 07 owns the full readiness inventory and its per-condition severity classification; ticket 08
  owns the final copy and presentation.

## Risks

**The readiness block is a code change with a real blast radius.** Removing the human club's Tactic
fallback means every path that resolves or starts a match must handle a null Tactic for the user's
club, including `resolveMatchday`, which currently loops all 10 Fixtures with no club-identity branch.
Done carelessly this turns a silent wrong tactic into a crash on the first Continue.

**Where the human's match is actually played is still unresolved, and this decision assumes it away.**
`startMatch` takes an arbitrary `opponentClubId` from `listOpponentClubs`, always seats the user at
home, and never reads or writes the `fixtures` table; `match.ts` still carries a comment saying real
fixtures would supersede this. So the Match day screen is an exhibition against a club of the player's
choosing, while the League Fixture is resolved headlessly inside `advanceCalendar`. The stop policy
above says a resolved human Matchday interrupts and links to the owning surface, but there is currently
no surface that owns the human's League match. Carried as its own ticket; until it resolves, the
Continue result's match section cannot be specified beyond the score.

**The Continue result is now a single point of failure for transient notification.** The inbox note
distributed the load on the assumption that this surface would be built well. If it ships thin, nothing
else catches what it drops, and the failure is quiet.

**"One press, one boundary" may not survive a richer calendar.** The claim rests on every current
boundary being interrupt-worthy. Adding any non-interrupting boundary makes the repeat loop real, and
with it cancellation, bounding, and partial-progress reporting — all deferred here.
