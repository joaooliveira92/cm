# Agent Note: The Tactics area lands on a read-only Overview; the editor is one sub-surface beneath it

Status: implemented

## Decision

Opening the Tactics area shows a read-only Tactics Overview, and the editor moved from the landing
to a sub-surface one step beneath it, so preparation is reviewed before it is edited.

The overview renders the one per-revision snapshot command (`getTacticsOverview`, ticket 02) as
cards and launches the supported preparation workflows (the editor, and match preparation when a
fixture is pending). Both workflows are reachable from the overview in one step and return to it
through the career shell's existing navigation; the overview itself changes nothing.

Three load-bearing shapes shipped with it:

### The route: a parent, not a tenth career screen

`/career/$saveId/tactics` is a parent route: index (`/`) is the overview and `editor` is the
editor. Both share the `tactics` screen scope, so focus restoration, action availability, and the
navbar's highlight treat the editor as a sub-surface. `CareerDestination` grew one member
(`tacticsEditor`) so navigation stays typed; `CAREER_SCREEN_TYPES` stays at nine and `g <key>`
stays scopeless — the editor is reached from the overview, never a tenth landing.

### Five view states, not ten

The overview runs the spec's view-state vocabulary reduced to what a read-only screen can honestly
hold: `loading`, `ready`, `conflicted`, `permission-limited`, `failed`. The editor-only
transcription states (modified, validating, submitting, completed) do not exist because nothing is
transcribed. `permission-limited` is not a new concept: it is the archived save's refusal mapped
onto the existing saved-state guard, and it renders the snapshot read-only with the editor and
match-preparation entries refused.

### A revision-guarded read

The overview renders from a snapshot it adopts by *declared revision*, never by arrival order. A
response that arrives carrying a revision older than the one already shown is discarded whole —
never partially rendered; a newer one is offered as a distinct conflicted state (refresh to adopt)
rather than swapped in underneath the player.

## Consequences

- Opening Tactics shows the overview (formation preview, instructions, familiarity, selection
  totals, set-piece status, issues with their owning screens), not the editor.
- Both preparation workflows are one step from the overview and return to it.
- Loading, ready, conflicted, permission-limited, and failed appear for their own triggers and
  clear again; a stale response is discarded, never partially rendered.
- The supported task set completes by keyboard and screen reader; slots are lists; warnings are
  associated with their controls; totals are announced without reading every change; state is
  never colour-only.
- `pnpm check:all` is green.

## Risks

- **`conflicted` is rare in a single-window game**: while the overview is mounted nothing else can
  write, so a higher-revision snapshot arriving mid-view comes only from a revalidation racing an
  external change. It still exists, is testable, and is the honest surface for a later concurrent
  writer; it is not a justification to auto-adopt and hide the condition.
- **The `editor` route child is a generic path segment.** The navbar maps `editor` → the tactics
  section explicitly; a second sub-surface added under another section would need its own mapping.