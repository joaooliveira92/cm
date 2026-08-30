# Screen 83: Team Instructions

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and licensed data only.

---

## 1. Purpose

Team Instructions configures collective behavior such as mentality, tempo, width, passing risk, defensive line, pressing, transition, time management, and phase-specific strategic priorities.

## 2. Primary user goals

- Set policy-supported team instructions
- Switch between in-possession, transition, and out-of-possession phases
- Apply named instruction presets
- Review dependency and conflict changes
- Save one validated instruction revision

## 3. Navigation context

```text
Global Application Shell
  -> Tactics or Match Preparation
  -> Team Instructions
  -> Related selection, report, tactic, or submission workflow
```

The screen preserves the active club, manager, tactic, fixture, source list, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| TEAM INSTRUCTIONS                        Tactic: Balanced 4-4-2               |
|------------------------------------------------------------------------------|
| Mentality [Balanced v] | Tempo [Standard v] | Width [Standard v]              |
| In possession: Passing, overlap, crossing, creativity                         |
| Transition: Counter, regroup, distribution                                    |
| Out of possession: Pressing, line height, marking, tackling                   |
|------------------------------------------------------------------------------|
| Conflicts: None | Familiarity impact: Moderate                                |
| [Restore Preset] [Review Conflicts] [Apply]                                   |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface TeamInstructionsDraft {
  readonly tacticId: string;
  readonly mentalityProfileId: string;
  readonly instructionValues: Readonly<Record<string, TacticalInstructionValue>>;
  readonly phaseProfiles: readonly TacticalPhaseProfile[];
  readonly conflicts: readonly TacticalInstructionConflict[];
  readonly familiarityImpact: FamiliarityImpactSummary;
  readonly revision: number;
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at process or network boundaries.

## 6. Principal interactions

- Set policy-supported team instructions
- Switch between in-possession, transition, and out-of-possession phases
- Apply named instruction presets
- Review dependency and conflict changes
- Save one validated instruction revision

## 7. View and operation states

- `loading`
- `ready`
- `modified`
- `validating`
- `previewing`
- `submitting`
- `completed`
- `conflicted`
- `permission_limited`
- `failed`

Asynchronous validation, suitability, report, import, and preview operations must support cancellation and request revisions. Late responses from another tactic, fixture, club, or manager context are discarded.

## 8. Tactical drafts and authoritative state

- Editing creates or updates a tactic or match-selection draft.
- A draft is not the submitted match plan until authoritative validation succeeds.
- The trusted application layer resolves formation, role, competition, eligibility, deadline, and permission constraints.
- Commands use stable IDs, expected revisions, and idempotency request IDs.
- Shared multiplayer edits use leases or optimistic conflict checks.

## 9. Knowledge and uncertainty

- Player suitability, opposition predictions, fitness, and tactical findings obey knowledge policy.
- Unknown information remains Unknown or approximate.
- Hidden attributes and opposition instructions must not leak through sorting, color, tooltips, previews, exports, or accessibility labels.
- Reports show author, confidence, observation date, and freshness.

## 10. Automatic and bulk operations

- Auto-selection, formation conversion, role assignment, and tactic import are deterministic for one input revision.
- They preview affected, preserved, reset, skipped, and conflicted values.
- They never submit a match plan automatically.
- One accepted plan produces one draft revision.

## 11. Validation and conflict handling

Distinguish invalid formation, missing player, duplicate assignment, legal ineligibility, tactical conflict, expired deadline, stale report, remote edit, permission loss, and operational failure. Preserve the last valid draft and offer Review Changes, Refresh, Retry, or Return.

## 12. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Provide non-drag alternatives for every spatial editor.
- Expose pitch slots, assignments, roles, duties, and instructions through accessible lists or grids.
- Associate warnings and disabled reasons with relevant controls.
- Announce meaningful totals and submission outcomes without reading every tactical change.
- Never communicate state by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layout.

## 13. Localization requirements

- Localize role, duty, position, instruction, phase, state, date, time, and competition labels.
- Preserve stable tactic, instruction, role, slot, player, fixture, and report IDs.
- Preserve structured personal names and native scripts.
- Use complete message templates rather than concatenated fragments.
- Pitch direction and left or right semantics must remain correct in right-to-left interfaces.

## 14. Responsive behavior

- Wide layouts may combine pitch, data grid, and details panel.
- Narrow layouts provide list-based editing without requiring a tiny pitch.
- High scaling moves secondary metadata to additional lines.
- Primary Apply, Submit, Back, and warning controls remain reachable.
- Ultrawide displays use bounded working widths.

## 15. Performance requirements

- Keep tactical validation, suitability calculation, and import migration outside the renderer.
- Recompute only affected slots and instructions.
- Cancel stale report and preview requests.
- Preserve stable player and slot identity.
- Rate-limit live fitness, deadline, and multiplayer updates.
- Avoid transporting the complete match engine state.

## 16. Security and integrity requirements

- Treat tactic names, imported packages, report prose, database labels, and network data as untrusted.
- Render text safely and parse imports through strict versioned schemas.
- Reject executable payloads, unknown IDs, invalid values, excessive nesting, and oversized packages.
- Enforce club and manager authority in a trusted process or server.
- Never trust renderer-calculated suitability, eligibility, conflict resolution, or final submission data.
- Sanitize exports and diagnostics.

## 17. Screen-specific rules

- Instruction ranges and dependencies come from tactical policy definitions
- Conflicting instructions require an explicit resolution preview
- Lower familiarity is a consequence, not a submission blocker unless policy says so
- Team instructions must not mutate individual instructions silently

## 18. Persistence rules

Persist explicit tactic drafts, active tactic references, saved tactic revisions, manager-scoped view preferences, and submitted match snapshots according to policy. Do not persist hover state, stale previews, invalid assignments, unconfirmed imports, or hidden opposition data.

## 19. Observability

Record operation duration, validation issue codes, import compatibility, conflict category, and safe submission outcome. Avoid recording private tactical details, complete lineups, report prose, manager identities, or imported package contents in general telemetry.

## 20. Edge cases

- A selected player becomes injured, suspended, transferred, or unregistered.
- The fixture deadline passes while editing.
- Another manager edits the same tactic or lineup.
- The active tactic is deleted, archived, or replaced.
- Imported policy versions are incompatible.
- The opposition report becomes stale.
- The same Apply or Submit command is sent twice.
- The host disconnects or migrates.

## 21. Acceptance criteria

1. Instruction ranges and dependencies come from tactical policy definitions
2. Conflicting instructions require an explicit resolution preview
3. Lower familiarity is a consequence, not a submission blocker unless policy says so
4. Team instructions must not mutate individual instructions silently
5. Loading, modified, invalid, conflicted, permission-limited, and completed states are distinct.
6. All draft and submission operations use stable IDs and current authoritative revisions.
7. Keyboard and assistive-technology users can complete every supported task without drag-only interaction.
8. No proprietary source-game assets, wording, likenesses, packages, or database records are required.

## 22. Recommended tests

- Normal authorized workflow.
- Stale tactic or fixture revision.
- Player becomes unavailable during editing.
- Permission loss.
- Deterministic automatic-action preview.
- Duplicate Apply or Submit request.
- Multiplayer concurrent edit.
- Deadline expiry.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 23. Condensed LLM implementation brief

```text
Implement Team Instructions for an original football-management simulation. Use stable
tactic, formation, slot, role, instruction, player, fixture, and report IDs;
immutable revisioned drafts; authoritative rule, permission, eligibility, and
deadline validation; cancellable asynchronous previews; deterministic automatic
actions; safe spatial and list-based editing; and idempotent revision-bound
commands. Preserve uncertainty and scouting knowledge. Never trust renderer-
calculated suitability, conflicts, assignments, or match submissions. Support
keyboard operation, non-drag alternatives, accessible pitch semantics, visible
focus, high text scaling, localization, and right-to-left layouts. Treat names,
reports, imports, labels, IDs, and network payloads as untrusted. Do not copy
proprietary artwork, exact wording, source code, logos, likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify team instructions screen
```
