# Agent Note: Retire Manager, and the Archived Save concept

Status: implemented

## Problem

Screen 20 "Retire Manager" gives the player a way to end a career deliberately, rather than waiting to be
sacked. The map settled that retirement is voluntary termination reusing the existing sacked-archive path,
differing in cause and messaging only — no interim-manager or club-continuity machinery. What remained was
the design: how the event and state record a second way for a career to end, what happens to the guard
whose name assumes there is only one, how strongly the action is confirmed, where it is reached from, and
what the player sees afterwards.

The state this landed in was built for a single cause. `manager_status` carried a `sacked` boolean and a
`last_outcome` enum written only by `judgeSeasonEnd`; `assertSaveNotSacked` read the boolean at every
mutating command handler and raised `SaveSackedError`, which crosses the RPC boundary into renderer copy.

## Decision

### Archived Save is the umbrella; sacking and retirement are its causes

A save is **archived** when it accepts no further commands. Archiving has two causes: the board sacked the
manager, or the manager retired. Everything downstream — the guard, the error, the Manager Profile badge,
the Save List marker — keys off the archived state, and only player-facing copy distinguishes the cause.

This replaces the previous model, where "sacked" was simultaneously the cause, the state, and the guard's
name. See [Board Objective derives from Stature Tier](2026-08-27-board-objectives-and-manager-sacking.md),
whose "Sacking ends the save" section this partially supersedes: the ladder, the reset rule, and the
absence of a win state all stand unchanged, but sacking is no longer the only thing that ends a career,
and the guard it names is renamed below.

### State: one nullable column

`manager_status.sacked` is gone. In its place:

```sql
archived_cause TEXT CHECK (archived_cause IS NULL OR archived_cause IN ('sacked','retired'))
```

`NULL` means the save is active. There is no boolean, so there is no pair of columns that must agree.

`last_outcome` is **not** touched by retirement. It means "what the board decided" and is written only by
`judgeSeasonEnd`; writing `'retired'` into it would both mislabel a player action as a board judgment and
destroy state, since a manager sitting at `warned` who retires would lose that warning. A retired save
therefore still reads `warned` on Season Summary when the career ended one miss from the sack, which is a
truer record than a reset. The Consecutive-Miss Counter survives retirement for the same reason.

`SeasonSummaryView.sacked: boolean` became `archivedCause`, so the renderer selects its closing message
from the cause rather than inferring it from `managerOutcome`.

`SaveSummary` gained the same nullable `archivedCause`, read by `listSaves` through a join onto
`manager_status`. This was not in the original proposal, which said only that a retired save "appears as
archived" in the Save List without saying how. Putting the cause on the summary rather than a derived
boolean keeps the Save List consistent with every other surface: one field, two causes, and the list
renders the state (`Archived`) while Season Summary is the only place the cause is spoken aloud.

This is a save-format break with no upgrade path: `schema.ts` creates tables fresh per save and the
`CHECK` constraint is baked into each existing save's DDL, so saves written before this change cannot
accept the new value. The repo has no migration machinery and this change did not add any.

### Event: `ManagerRetired`, alongside `ManagerSacked`

A season-stream event, `ManagerRetired { seasonNumber }`. `ManagerSacked` is unchanged.

Event tags are historical facts, and "the board sacked me" and "I retired" are different facts; a shared
`ManagerTerminated { cause }` would flatten them into one tag that every reader has to destructure. The
payload deliberately omits `consecutiveMisses` — that field is in `ManagerSacked` because the counter is
what caused the sacking, and including it here would imply the same of retirement.

Unlike `ManagerSacked`, which `judgeSeasonEnd` raises as an in-process reactor to `SeasonConcluded`,
`ManagerRetired` is raised by a player command and can fire at any safe boundary. The command lives in
`season.ts` rather than `managerProfile.ts` so that every `manager_status` write stays in one module,
beside `startSeason`'s insert and `judgeSeasonEnd`'s update.

### The guard and the error are renamed

`assertSaveNotSacked` → `assertSaveNotArchived`, reading `archived_cause IS NOT NULL`.
`SaveSackedError` → `SaveArchivedError`, carrying the cause.

Both names became false the moment a second cause existed, and `SaveSackedError` was worse than a naming
blemish: it is a typed error the renderer turns into player-facing text, and "you have been sacked" is the
wrong sentence for a save the player retired from. The rename was mechanical across every call site and
fully covered by typecheck; the renderer now picks its refusal copy from the carried cause.

### Confirmation: an Irreversibility Disclosure, not a checkbox

Retirement is confirmed by an **Irreversibility Disclosure** — the existing `CONTEXT.md` concept for a
statement made before commitment that an action freezes state normal navigation cannot reverse — plus a
distinct destructive confirm button labelled with the verb (`Retire Manager`). `Cancel` takes default
focus and Escape cancels, so the keyboard's cheapest action never ends a career.

Spec 20 §9's acknowledgement checkbox is dropped: it is a second mechanism doing the disclosure's job, and
the repo already has the vocabulary and the availability rule ("at every applicable boundary, never
suppressed once seen"). Typed-name confirmation, offered by the same section as policy, is dropped too —
it is ceremony for shared or production systems, and this is a local single-player save the player can
delete outright from the Save List with less friction than typing a name.

### Preconditions: two, enforced at different layers

1. The save is not already archived — which is just `assertSaveNotArchived`, so retirement carries the
   same guard as every other mutating command and needs no special case.
2. The save is not mid-match.

The proposal said the second was "checked through the same phase test the calendar uses". That test does
not exist: `advanceCalendar`'s only phase test is `season_complete`, and the main process holds no notion
of an in-flight match at all — a Match Decider stream is resimulated whole on every call, and nothing is
persisted to mark a match as finished. "Mid-match" is renderer-owned state, the resume session in
`match/session.ts`, so that is where the precondition is enforced: while `getActiveMatch(saveId)` returns
a session, the Retire Manager action is disabled and says why rather than silently doing nothing.

This is weaker than a command-level guard — a direct RPC call would not be refused mid-match — and it is
weaker deliberately. Giving the main process a persisted notion of "a match is in progress" means a new
command and new state that only this precondition would use, which is a larger change than the one this
note is about. Whoever adds a match-completion marker should move this check down with it.

The other five preconditions in spec 20 §4 — controller authority, expected revisions, recovery
checkpoint, incompatible transactions, multiplayer host authority — have no referent here. The command is
a single SQL transaction against a local file, and the event log is the audit trail.

### Entry point: a dialog on Manager Profile

Retirement is a dialog opened from the Manager Profile screen. It is not a route, and it is not reachable
from the application shell. It offers no retire action at all once the save is archived.

Manager Profile already owns manager identity and already renders the `Active`/`Archived` badge (see
[Manager Profile screen](2026-08-30-manager-profile-screen.md), whose open risk about how retirement gets
recorded this note closes). A career-ending action in the shell would sit next to a list of saves, where
firing it against the wrong one is possible. As a dialog it needs no route and no keyboard-tier assignment.

The proposal expected the dialog to inherit whatever confirmation pattern ticket 08 settles for Quit
Confirmation. That ticket has not shipped, so this dialog is local to the Manager Profile screen and reuses
the existing `useDialogKeyboard` hook for focus ownership, Tab trapping, and Escape. Quit Confirmation is
the second consumer and the right place to extract a shared component — extracting one from a single
consumer now would fix the wrong shape first.

### Afterwards

Confirming returns the player to the Save List, where the save appears as `Archived` and still opens —
read-only is not gone. There is no success screen: spec 20 §18's exists to offer "switch to another
manager" and "add manager", neither of which has a referent.

The retired save's Season Summary shows, where the sacked banner would be, a neutral line:
`Career ended — you retired at the end of Season N`. The two are distinguished by cause and by tone: the
sacked banner explains a loss the player did not choose, the retirement line records one they did. Manager
Profile and the Save List show `Archived` for both.

## Alternatives considered

- **A shared `ManagerTerminated { cause }` event replacing `ManagerSacked`.** Rejected: it discards the
  distinction between two genuinely different historical facts, and rewriting an existing event tag is a
  heavier change to the stream than adding one.
- **`'retired'` as a fourth `last_outcome` value.** Rejected after tracing the writers: `last_outcome` is a
  board judgment, and a retiring manager who is currently `warned` would have that warning overwritten.
- **Keeping the `sacked` boolean and adding `archived_cause` beside it.** Rejected: two columns that must
  agree, with no state the single nullable column cannot express.
- **Renaming the guard but keeping `SaveSackedError`.** Rejected: the error tag reaches the renderer and
  becomes player-facing copy, which is exactly where the wrong name does damage.
- **The acknowledgement checkbox from spec 20 §9.** Rejected as a duplicate of the Irreversibility
  Disclosure, which already covers this boundary and is never suppressed.
- **Typed-name confirmation.** Rejected: heavier than deleting the save, which is the more destructive
  neighbouring action.
- **Retire Manager as its own route.** Rejected: a screen whose entire content is one confirmation earns no
  route, no navigation entry, and no keyboard tier.
- **Reachable from the application shell as well as Manager Profile.** Rejected: two entry points to an
  irreversible action, one of which is not scoped to an open save.
- **Resetting the Consecutive-Miss Counter on retirement.** Rejected: the archived save is a historical
  record, and the counter's final value is part of the story of how the career ended.
- **A persisted "match in progress" marker so the mid-match precondition could live in the command.**
  Rejected for this change: it is a new command and new state whose only consumer would be this one
  precondition, in a codebase where the match timeline is deliberately derived rather than stored.
- **A boolean `archived` on `SaveSummary` instead of the cause.** Rejected: it would make the Save List the
  one surface that cannot answer *why*, and re-introduce the shape this note removed from
  `SeasonSummaryView`.

## Consequences

What now holds:

- `manager_status` has `archived_cause` and no `sacked` column; `NULL` means active.
- `last_outcome` and the Consecutive-Miss Counter are never written by the retirement command.
- A `ManagerRetired { seasonNumber }` event is appended to the season stream on retirement.
- `assertSaveNotArchived` and `SaveArchivedError` replace their sacked-specific names at every call site,
  and `SaveArchivedError` carries the cause, which the renderer words its refusal from.
- Retirement is rejected when the save is already archived (in the command) and when the save is mid-match
  (in the renderer, per the precondition section above).
- Manager Profile offers a Retire Manager action that opens a dialog carrying an Irreversibility
  Disclosure and a distinct destructive confirm; `Cancel` has default focus.
- No route, navigation entry, or keyboard tier was added for Screen 20.
- Confirming returns to the Save List, where the save reads `Archived` and still opens.
- Season Summary shows the retirement line for `retired` and the existing sacked banner for `sacked`.
- `CONTEXT.md` carries **Archived Save** and **Manager Retired**, and **Manager Sacked** references the
  umbrella.

What this costs, and what to watch:

- **The save-format break is real and unmitigated.** Every save written before this change carries a
  `CHECK` constraint that rejects the new column's values, and there is no migration layer to fix them.
  This is acceptable while the project is pre-release, and it stops being acceptable the moment a save
  written by a shipped build has to survive an upgrade. Whoever adds migration machinery should treat this
  as one of the changes that made it necessary.
- **`ManagerRetired` is the first player-command event on the season stream.** Every other event there is
  written by the calendar or by `judgeSeasonEnd` as a reactor. Nothing prevents a command from appending,
  but stream readers written with the reactor assumption in mind may need checking.
- **The mid-match precondition is renderer-only.** See the precondition section: it holds for the shipped
  UI and would not hold for a caller reaching the RPC directly. This is the one place where the enforcement
  is weaker than the rule.
- **Retirement has no mechanical consequence beyond archiving.** A player who expected retirement to be a
  graceful ending with an epilogue — career summary, honours, a closing screen — gets a return to the Save
  List. If that lands flat in play, the fix is a retirement epilogue on Season Summary, not a change to
  this state model.
