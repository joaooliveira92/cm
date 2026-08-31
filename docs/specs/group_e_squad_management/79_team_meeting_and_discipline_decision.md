# Screen 79: Team Meeting and Discipline Decision

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, fictional people, and licensed data only.

---

## 1. Purpose

Team Meeting and Discipline Decision handles squad-wide meetings and club disciplinary responses to supported incidents while preserving procedural consistency, proportionality, and private player data.

## 2. Primary user goals

- Choose a supported meeting context and audience
- Review message or disciplinary options
- Inspect rule, contract, and prior-incident context
- Preview affected and excluded players
- Confirm one authoritative decision

## 3. Navigation context

```text
Global Application Shell
  -> Club Squad or Match Preparation
  -> Team Meeting and Discipline Decision
  -> Player, tactic, registration, interaction, or confirmation workflow
```

The screen preserves the active club, manager, fixture, competition, and source-list context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| TEAM MEETING OR DISCIPLINE                                                    |
|------------------------------------------------------------------------------|
| Context: Poor recent form                                                     |
| Audience: First-team squad                                                    |
| Tone and message options with expected interpretation                         |
|------------------------------------------------------------------------------|
| Discipline case: Player missed training                                      |
| Options: Warning | Fine where rules permit | No action                       |
| [Review Consequences] [Cancel] [Confirm Decision]                             |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface TeamInteractionDecisionDraft {
  readonly decisionId: string;
  readonly managerId: string;
  readonly clubId: string;
  readonly type: "team_meeting" | "discipline";
  readonly audiencePlayerIds: readonly string[];
  readonly contextFacts: readonly InteractionContextFact[];
  readonly permittedOptions: readonly TeamDecisionOption[];
  readonly selectedOptionId?: string;
  readonly revision: number;
}
```

Renderer-facing models must be immutable per revision, serializable, and validated at process or network boundaries.

## 6. Principal interactions

- Choose a supported meeting context and audience
- Review message or disciplinary options
- Inspect rule, contract, and prior-incident context
- Preview affected and excluded players
- Confirm one authoritative decision

## 7. Operation states

- `loading`
- `ready`
- `modified`
- `validating`
- `submitting`
- `completed`
- `conflicted`
- `permission_limited`
- `failed`

Every asynchronous operation must use cancellation and request revisions. Late results from a prior squad, player, tactic, fixture, or manager context are discarded.

## 8. Validation and authoritative rules

- The trusted application layer resolves competition, contract, medical, selection, and permission constraints.
- The renderer displays results and submits narrow commands only.
- Mutations require stable IDs, expected revisions, and idempotency request IDs.
- Invalid or stale drafts remain editable but cannot be submitted.
- Consequential automatic changes require an explicit preview.

## 9. Knowledge and privacy

- Condition, morale, attributes, role suitability, relationships, medical information, and staff recommendations obey viewer knowledge and permission.
- Unknown information remains Unknown or approximate.
- Hidden values must not leak through sorting, colors, tooltips, previews, exports, or accessibility labels.
- Hot-seat switching clears private transient state.

## 10. Bulk and automatic actions

- Auto-select, auto-assign, and bulk operations are deterministic for one input revision.
- They preview affected, skipped, locked, and conflicted players.
- They never submit automatically.
- One transactional apply creates one revision.
- Undo may be offered before final authoritative submission.

## 11. Accessibility

- Support complete keyboard operation and visible focus.
- Expose player lists as accessible grids with sort and selection state.
- Associate eligibility, warnings, and disabled reasons with the relevant row or control.
- Announce meaningful totals and submission outcomes without reading every changed cell.
- Never communicate state by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layout.

## 12. Localization

- Localize positions, roles, states, dates, numbers, money, rules, and plural forms.
- Preserve stable IDs independently from display names.
- Preserve structured personal names and native scripts.
- Apply locale-aware sorting and search.
- Use complete message templates rather than concatenated fragments.

## 13. Responsive behavior

- Wide layouts may combine player grid, detail panel, and summary.
- Narrow layouts stack controls, player cards, constraints, and actions.
- High scaling moves secondary data to additional lines.
- Sticky summaries must not cover player rows or submission actions.
- Ultrawide displays use readable maximum widths.

## 14. Performance

- Virtualize long squad lists.
- Recalculate derived summaries incrementally.
- Cancel stale validation and preview requests.
- Preserve stable player-row identity.
- Keep rule resolution, auto-selection, and impact calculation outside the renderer.
- Rate-limit live fitness, availability, and multiplayer updates.

## 15. Security and integrity

- Treat names, labels, user text, rules, and network payloads as untrusted.
- Render content as text or constrained structured blocks.
- Validate every club, player, fixture, competition, and action ID.
- Enforce manager authority on the host or trusted application service.
- Use safe integer handling and explicit currency units.
- Never trust renderer-calculated eligibility, totals, reactions, or assignments.
- Sanitize copied and exported summaries.

## 16. Screen-specific rules

- Discipline must follow competition, contract, club, and jurisdiction policy
- Financial penalties require explicit rule support and safe money handling
- Team reactions are derived after commit and may vary
- The workflow must not generate abusive or humiliating content

## 17. Persistence

Persist manager-scoped view preferences and explicitly saved drafts. Canonical lineup, registration, captaincy, numbering, interaction, and discipline changes are stored only after authoritative submission. Do not persist transient hover state, stale previews, or invalid assignments.

## 18. Error and conflict handling

Distinguish stale revision, permission loss, rule change, deadline expiry, remote edit, unavailable player, and operational failure. Preserve the last valid draft where safe and guide the user to Refresh, Review Changes, Retry, or Return.

## 19. Edge cases

- A player becomes injured, suspended, transferred, or unavailable while the screen is open.
- The fixture or registration deadline changes.
- Another manager edits the same shared squad state.
- The host disconnects or migrates.
- Filters hide a selected player.
- An auto-action completes after the draft changes.
- The user submits the same action twice.
- The career advances to a later canonical revision.

## 20. Acceptance criteria

1. Discipline must follow competition, contract, club, and jurisdiction policy
2. Financial penalties require explicit rule support and safe money handling
3. Team reactions are derived after commit and may vary
4. The workflow must not generate abusive or humiliating content
5. Loading, modified, invalid, conflicted, permission-limited, and completed states are distinct.
6. All mutations use current authoritative rules and revisions.
7. Keyboard and assistive-technology users can complete every supported task.
8. No proprietary source-game assets, wording, likenesses, or database records are required.

## 21. Recommended tests

- Normal authorized workflow.
- Player becomes unavailable during editing.
- Stale draft revision.
- Permission loss.
- Deterministic auto-action preview.
- Duplicate submission.
- Filter hides selected player.
- Multiplayer concurrent edit.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 22. Condensed LLM implementation brief

```text
Implement Team Meeting and Discipline Decision for an original football-management simulation. Use stable
club, player, fixture, competition, and draft IDs; immutable revisioned read
models; authoritative rule and permission resolution; cancellable asynchronous
validation; deterministic previewable automatic actions; transactional draft
submission; and idempotency request IDs. Preserve knowledge limits, privacy,
accessibility, localization, and safe multiplayer concurrency. Never infer hidden
values or trust renderer-calculated eligibility, totals, assignments, or player
reactions. Do not copy proprietary artwork, exact wording, source code, logos,
likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify team meeting and discipline decision screen
```
