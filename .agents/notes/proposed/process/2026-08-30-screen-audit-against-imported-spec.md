# Agent Note: Auditing a screen against the imported spec

Status: proposed

## Problem

The Group A import carries 21 screen specs, sixteen of which have an implementation to compare
against. The [reconciliation ledger](2026-08-30-spec-reconciliation-ledger.md) fixed what a *row*
looks like — four kinds, a mandatory anchor, silence meaning "followed" only under an `Audited`
status line. It did not fix what an *audit* is: which artifact the auditor reads, how far a finding
is allowed to travel, or what stops the exercise turning into a redesign of the thing being audited.

The shell was audited first because it is the spine the other screens sit inside, and because
whatever it produced was going to be copied fifteen more times. The question is what that shape is.

## Proposal

**A screen audit reads the implementation, writes ledger rows, and changes no code.** Its entire
output is one screen's section of `RECONCILIATION.md` plus the coverage-table status flip. A place
the implementation must change is recorded as a row, never fixed in place: the fix belongs to the
spec that ticket 10 assembles and to the tickets cut from it, where it can be sized and sequenced
against everything else.

### The existing decision wins

Where the import disagrees with a decision this codebase has already made, the audit registers the
disagreement as a `contradicted` row and stops. It does not reopen the decision, and it does not
soften the row into a `deferred` to make the disagreement look smaller. The anchor names the note or
`CONTEXT.md` term carrying the decision, so a reader who wants to overturn it knows exactly what they
are overturning.

This matters most where the codebase's decision is *narrower* than it looks. The shell audit found
one: the save-management-edge-cases note deliberately locks a stale save entry to a silent no-op with
"no error banner", which contradicts the import's requirement to mark corrupt entries — but that note
says nothing about the save *repository* failing wholesale, which the Save List swallows just as
silently with nothing having decided it should. Those are two rows with two kinds, not one row. An
audit that matched on topic rather than on proposition would have collapsed them and hidden the
unowned half.

### Scope rulings are part of the audit

An auditor may rule a section permanently out of scope when the game has no referent for it at all,
recording the reason in the row's anchor and a matching line on the effort's map. The shell audit
made two: an enabled-mods indicator, because nothing in the app loads third-party content, and the
menu's online update check, which extends the existing off-device-telemetry axis — the app has no
backend to query and no update channel. Both are scope, not sharpness, so they never graduate.

### `unscheduled` is the honest answer, and it accumulates

The shell audit produced six `deferred` rows anchored to `unscheduled`: credits, a version footer,
last-opened-save memory, repository-failure handling, localization, and the acceptance-criteria
rewrite. That is a lot out of 28 rows, and it is correct — those sections
describe things this project genuinely has not decided either way. The alternative was inventing
owners, which would make the ledger read cleaner and assert things nobody has agreed to.

### A shell audit is wider than one screen

Screen 1's sections cite the entry screen but constrain the whole shell: keyboard interaction, focus
visibility, error handling, responsive behaviour, and the command model are shell-wide properties
that happen to be written down under the first screen. The audit follows them into
`keymap/`, `actions/`, `KeyboardSpine.tsx`, and the main-process entry rather than stopping at the
route component. The fifteen remaining screen audits are narrower by nature and should not inherit
this reach.

### Fidelity: Screen 1 is the exception, not the template

Screen 1 was audited section by section and cost one session for 15 sections. The fifteen surviving
screens carry 807 sections between them — an average of 53 each, and 82 for Screen 16. Held at Screen
1's fidelity the remaining audit is on the order of 40 sessions.

It is not worth that. Of Screen 1's 28 rows, roughly five changed anyone's mind: the entry point is a
Save List rather than a Main Menu, the shell has no way to quit or reach settings, a failed
`listSaves()` is swallowed, the Save List declares no Actions, and it has no keyboard tier. The other
twenty-three restate scope already ruled elsewhere, or record that an obviously-unbuilt thing is
unbuilt.

**So the remaining screens are `Reviewed`, not `Audited`, and the audit runs implementation-first.**
The auditor reads the screen, then asks what the import demands that materially conflicts with it —
rather than walking every `## N.` heading looking for something to say. One session per screen, hard
cap. The ledger carries `Reviewed` as a third status whose silence asserts nothing, so the weaker pass
cannot masquerade as the stronger one.

This knowingly gives up the guarantee that made `Audited` worth having. A `Reviewed` screen can hide a
section that is neither followed nor recorded, and nobody will know without redoing the pass. That is
the price of finishing.

### No row may be left `unscheduled`

An audit that cannot place a `deferred` row with an owning spec group must instead rule the section
out of scope, or cut it a ticket. `unscheduled` is not an available answer.

Screen 1 produced six `unscheduled` rows out of 28. At that rate the fifteen remaining screens deliver
around ninety unowned requirements to ticket 10 in a single batch, which is ninety decisions made by
whoever assembles the spec, at the point of least context. Forcing the choice into the audit that
found the row spreads the same decisions across fifteen sessions, each made by someone who has just
read the relevant screen.

The rule has already claimed its first row: Screen 1 §10.1's swallowed `listSaves()` failure moved
from `unscheduled` to its own `save-list-error-handling` ticket, because it is a defect and does not
need a spec to authorise fixing it.

## What the shell audit found

Three findings outlive the ledger row that records them, because each is a property of the shell
rather than of one import section:

- **The Save List sits outside the Action registry.** `saveList` is a declared `ScreenName` and a
  legal action scope, but no Action in `allActions.ts` uses it; both of the screen's buttons are raw
  `onClick` closures. Under the action-model note's "all-or-nothing per screen" rule the app's
  entry screen is its one unconverted screen, so neither Continue-a-save nor Start-New-Career appears
  in the command palette, the help overlay, or the key map.
- **The Save List has no keyboard tier.** The screen-keyboard-tiers note assigns levels to nine
  screens and the Save List is not among them. Its two controls put it at level 2 minimum under that
  note's own rule; ticket 09 already owns tier assignment for the new screens and absorbs this.
- **The shell offers no way to quit, open settings, or read credits.** All three are menu entries in
  the import with no surface in the app to hang them on, because the Save List is a list rather than
  a menu. Screens 16 and 21 own two of them; the surface itself is ticket 09's.

## Alternatives considered

- **Fix the small things while auditing.** Adding a focus ring or an error banner to the Save List
  while the file is open is cheap and tempting. Rejected: it splits the record, because the ledger
  would then describe a screen that no longer exists, and it decides sequencing by whichever screen
  happened to be audited first rather than by ticket 10's assembled spec.
- **Audit only the sections with an obvious implementation counterpart, under the `Audited` line.**
  Faster, and it would have cut the shell's row count roughly in half. Rejected because the ledger's
  silence rule makes `Audited` an assertion about *every* section; a partial audit under that line
  asserts more than it checked. The `Reviewed` status above is this option done honestly — the same
  cheaper pass, with a status line that does not overclaim.
- **One row per import section.** The ledger's granularity rule already allows grouping, and the
  shell's accessibility and keyboard sections divide by concern rather than by number. Grouping by
  the decision that carries them keeps related sections at one anchor.
- **Ruling localization out of scope.** A single-player local game with no translator has a real case
  for it, and it would have removed two rows. Rejected as beyond an auditor's authority: unlike the
  mod indicator, localization has an obvious referent and someone may well want it.

## Acceptance criteria

- A screen's section of `RECONCILIATION.md` carries a row for every section the implementation does
  not follow, each with a populated anchor, and the coverage table reads `Audited`.
- No file outside `RECONCILIATION.md`, the effort map, and the ticket changes during an audit.
- Every `contradicted` row names an existing note or `CONTEXT.md` term; no audit invents one.
- Any section ruled out of scope during an audit appears on the effort map's Out of scope section
  with the ticket that ruled it.

## Risks

- **The no-`unscheduled` rule can be satisfied dishonestly.** Forcing every row to name an owner
  invites parking sections in whichever spec group is nearest, or ruling them out of scope to avoid the
  work of placing them. That failure is harder to see than an honest `unscheduled` pile was, because
  the row looks resolved.
- **"Register, don't fix" is unenforced.** Nothing stops a later audit from editing the screen it is
  reading, and the divergence would be invisible until someone re-read the ledger against HEAD.
- **The shell audit's reach is a bad precedent if copied literally.** Following Screen 1's sections
  into four directories was right for the spine and would be scope creep on Screen 8. The judgment is
  stated here but not encoded anywhere a future session must read.
