# Screen 97: Live Match Tactics and Substitutions

> **Clean-room notice:** This specification describes an original football-management simulation inspired by early-2000s management games. Use original text, visuals, commentary, fictional people, and licensed data only.

---

## 1. Purpose

Live Match Tactics and Substitutions allows the manager to prepare and submit formation, instruction, role, marking, tempo, mentality, and player changes during an active match.

## 2. Primary user goals

- Create a pending tactical change
- Select outgoing and incoming players
- Change roles and team instructions
- Preview conflicts and remaining substitution allowance
- Submit changes for the next valid match-engine boundary

## 3. Navigation context

```text
Global Application Shell
  -> Fixture or Match Day
  -> Live Match Tactics and Substitutions
  -> Related live view, player, tactic, incident, report, or competition
```

The screen preserves the active fixture, controlled club, manager, match revision, and source navigation context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Current tactic, pending tactic, substitution slots, match state, stoppage an |
|------------------------------------------------------------------------------|
| Match-specific content, validated status, navigation, warnings, and actions   |
|                                                                              |
| [Primary Views] [Context Actions] [Back or Continue]                          |
+------------------------------------------------------------------------------+
```

The layout is conceptual and must use an original presentation system.

## 5. Core data model

```typescript
interface LiveTacticalChangeDraft {
  readonly fixtureId: string;
  readonly matchRevision: number;
  readonly controlledClubId?: string;
  readonly phase: MatchLifecyclePhase;
  readonly contentRevision: number;
  readonly issues: readonly MatchViewIssue[];
  readonly permittedActions: readonly MatchAction[];
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at process or network boundaries.

## 6. Principal interactions

- Create a pending tactical change
- Select outgoing and incoming players
- Change roles and team instructions
- Preview conflicts and remaining substitution allowance
- Submit changes for the next valid match-engine boundary

## 7. Match lifecycle states

- `scheduled`
- `awaiting_team_submission`
- `pre_match`
- `first_half`
- `half_time`
- `second_half`
- `extra_time`
- `penalty_shootout`
- `completed`
- `abandoned`
- `awarded`
- `failed`

The screen must expose only actions valid for the current phase and authoritative match revision.

## 8. Canonical event stream

- Score, clock, statistics, ratings, incidents, commentary, and reports derive from one ordered canonical match-event stream.
- The renderer cannot create, reorder, or delete canonical events.
- Late events for an older match revision are discarded.
- Corrected events create audited replacements according to competition policy.
- Presentation pacing never changes the canonical outcome.

## 9. Live commands and safe boundaries

- Tactical changes, substitutions, messages, and appeals use narrow authoritative commands.
- Commands include fixture ID, expected match revision, manager authority, and idempotency request ID.
- Changes may be queued until a valid stoppage or phase boundary.
- Duplicate commands return the original result.
- The interface distinguishes pending, accepted, applied, rejected, and expired commands.

## 10. Knowledge and visibility

- Opposition predictions and tactical findings obey scouting knowledge and release boundaries.
- Hidden match-engine weights, opposition instructions, and private manager choices are never exposed.
- Unknown or unavailable data remains explicit.
- Multiplayer spectators and opposing managers receive policy-filtered views.

## 11. Validation and error handling

Distinguish stale match revision, missed deadline, invalid lineup, unavailable substitute, exhausted substitutions, lost authority, disconnected host, incomplete event data, and operational failure. Preserve the last valid view and provide Refresh, Retry, Return, or Recovery actions.

## 12. Accessibility requirements

- Provide complete keyboard navigation and visible focus.
- Announce score and major match events without overwhelming users.
- Offer reduced live-update verbosity, pauseable auto-scroll, captions, and visual sound cues.
- Expose statistics and event timelines through accessible tables and lists.
- Never communicate score, card, injury, rating, or momentum state by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layout.

## 13. Localization requirements

- Localize commentary, phases, positions, roles, incidents, dates, times, scores, measurements, and plural forms.
- Preserve stable match, event, player, club, competition, tactic, and incident IDs.
- Preserve structured names and native scripts.
- Use complete event templates rather than concatenated fragments.
- Ensure score order and home-away semantics remain correct in right-to-left layouts.

## 14. Responsive behavior

- Wide layouts may combine scoreboard, timeline, pitch, and detail panels.
- Narrow layouts prioritize score, clock, current event, and essential actions.
- Data grids may transform into accessible cards.
- High scaling keeps score, phase, warnings, and primary actions visible.
- Ultrawide displays use bounded working widths.

## 15. Performance requirements

- Stream compact event deltas rather than complete match state on every update.
- Rate-limit presentation updates while preserving every canonical event.
- Virtualize long commentary and incident timelines.
- Cancel stale report and detail requests.
- Keep match simulation, aggregation, and rating calculations outside the renderer.
- Avoid UI work that blocks command acknowledgment.

## 16. Security and integrity requirements

- Treat commentary, reports, database labels, imported media, and network payloads as untrusted.
- Render text safely through constrained templates.
- Validate every fixture, player, club, event, tactic, and command ID.
- Authenticate manager and spectator authority on the host or trusted service.
- Never trust renderer-calculated score, clock, ratings, statistics, eligibility, or match state.
- Sanitize exports and diagnostics.

## 17. Screen-specific rules

- Pending changes do not affect the match before acceptance
- Competition substitution rules are authoritative
- Dismissed and injured-player constraints are explicit
- Duplicate submissions return the original result

## 18. Persistence rules

Persist canonical match events, submitted lineups, accepted tactical commands, incidents, final statistics, reports, and interaction outcomes through authoritative transactions. Do not persist transient animation state, auto-scroll position as canonical data, stale predictions, or rejected commands.

## 19. Observability

Record event throughput, phase transitions, command latency, stale-event rejection, and safe failure codes. Avoid recording private tactics, complete commentary content, manager messages, hidden engine weights, or player health details in general telemetry.

## 20. Edge cases

- A player is injured, dismissed, or removed during a pending substitution.
- The match enters extra time or a penalty shootout.
- The host disconnects or migrates.
- A command acknowledgment arrives after the phase changes.
- The match is abandoned or awarded.
- A correction changes a recorded incident after full time.
- The same command is submitted twice.
- The user navigates away and returns during live play.

## 21. Acceptance criteria

1. Pending changes do not affect the match before acceptance
2. Competition substitution rules are authoritative
3. Dismissed and injured-player constraints are explicit
4. Duplicate submissions return the original result
5. The view is bound to one fixture and current authoritative match revision.
6. Loading, live, completed, stale, permission-limited, and failed states are distinct.
7. All consequential commands are revision-bound and idempotent.
8. Keyboard and assistive-technology users can follow and operate every supported phase.
9. No proprietary source-game assets, commentary, wording, likenesses, or database records are required.

## 22. Recommended tests

- Normal scheduled or live match state.
- Stale match revision.
- Player injury or dismissal.
- Extra time and penalty shootout.
- Abandoned or awarded match.
- Duplicate command.
- Multiplayer disconnect and recovery.
- Large commentary timeline.
- Keyboard and screen-reader flow.
- High text scaling and right-to-left layout.

## 23. Condensed LLM implementation brief

```text
Implement Live Match Tactics and Substitutions for an original football-management simulation. Use one
ordered canonical match-event stream, stable fixture and event IDs, immutable
revisioned read models, authoritative phase and permission validation,
idempotent live commands, safe stoppage boundaries, compact event deltas,
knowledge-limited opposition information, and deterministic aggregation. Never
trust renderer-created scores, clocks, ratings, statistics, incidents, lineups,
or tactical state. Support keyboard navigation, accessible live regions,
pauseable commentary, reduced update verbosity, captions, visible focus, high
text scaling, localization, and right-to-left layouts. Treat commentary,
reports, labels, media, IDs, and network events as untrusted. Do not copy
proprietary artwork, commentary, exact wording, source code, logos, likenesses,
or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify live match tactics and substitutions screen
```
