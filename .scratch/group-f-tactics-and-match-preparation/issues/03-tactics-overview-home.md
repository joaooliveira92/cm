# 03: Tactics Overview becomes the read-only home of tactical preparation

**What to build:** The Tactics area's landing surface becomes a read-only Tactics Overview that summarizes the active tactic and launches the supported preparation workflows, with the editor one link away rather than the default view.

The overview renders the snapshot from ticket 02 as cards: a formation preview, the three team-instruction values, the derived familiarity summary, the selection totals (starters against substitutes), the set-piece status, and the issues list with each finding's destination. It offers navigation onward — into the tactics editor for full editing, and into match preparation when a fixture is pending — and returns. Editing stays in the editor; the overview itself changes nothing.

The screen runs the spec's view-state vocabulary as distinct, observable states: loading, ready, modified, validating, submitting, completed, conflicted, permission-limited, and failed. Permission-limited is the archived-presentation's refusal mapped onto the existing saved-state guard, not a new concept. Responses that arrive late from an older tactic, fixture, or save revision — or from a different club, fixture, or manager context — are discarded rather than rendered.

Accessibility is not decorative: the entire supported task set completes by keyboard and screen reader with no drag-only interaction, slots are exposed through lists or grids, warnings are associated with the controls or rows they concern, totals are announced without reading every change, nothing communicates state by color alone, and the screen holds at 200 percent text scaling and right-to-left layout. The overview neither resolves match results nor reveals data it does not hold, and it holds nothing secret.

Seam: read-mostly screen consuming the snapshot command and the existing navigation, behind the application shell's career surface. It adds no failure channel of its own — every state it displays traces to the snapshot's typed outcomes or the saved-state guard. It needs the tactics, squad, and fixture readiness reads the snapshot already exposes, and the navigation surface the area already lives in.

**Decisions:**

- The Tactics landing is the read-only Overview; the editor becomes its linked destination rather than the default, so preparation is reviewed before it is edited. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-router-adoption-shape.md).
- View states are distinct and observable, and stale requests — superseded revisions, mismatched context — are discarded whole under the reactive read pattern. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-atom-adoption-shape.md).
- Every task reaches keyboard and screen-reader completion, warnings are associated with their controls, and state is never color-only — the recognition patterns already used elsewhere in the career surface. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-keyboard-tier-and-listbox.md).
- The overview reveals nothing it does not hold: there is no opposition, scouting, or hidden-instruction data on this screen to leak. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-03-the-first-pending-decision.md).

**Blocked by:** 02 (The overview reads one per-revision tactical snapshot) — the overview is a consumer of that snapshot; there is no summary to render before it exists.

**Status:** resolved

- [x] Opening Tactics shows the overview, not the editor: formation preview, instruction summary, familiarity, selection totals, set-piece status, and issues with destinations.
- [x] Every supported workflow is reachable from the overview in one step and returns to it: the tactics editor, and match preparation when a fixture is pending.
- [x] Loading, ready, conflicted, permission-limited, and failed are distinct, observable states that appear for their own trigger and clear again.
- [x] A response from an older tactic, fixture, or save revision — or a mismatched context — is discarded, never partially rendered.
- [x] The full supported task set completes by keyboard and by screen reader with no drag-only interaction; meaningful totals are announced without reading every change; state is communicated by more than color alone.
- [x] The overview resolves no match results and surfaces no opposition or hidden state.
- [x] `pnpm check:all` is green.