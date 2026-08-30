# Screen 18: Game Status

> **Clean-room notice:** Use original interface text, visuals, and fictional or licensed data.

## 1. Purpose

The **Game Status** screen is a read-only technical and simulation overview of the active career. It helps users understand the current world date, processing state, loaded scope, save health, application versions, resource usage, and multiplayer condition without exposing unsafe internal implementation details.

## 2. Entry points

```text
Global Navigation -> Game Status
Application Menu -> Game Status
Processing Overlay -> View Details
Save Warning -> View Career Status
```

## 3. Main layout

```text
+----------------------------------------------------------------------------+
| GAME STATUS                                     Career: North United Story |
|----------------------------------------------------------------------------|
| Career date: 12 February 2005     Status: Waiting for manager input        |
| Last save: 21:47                  Autosave: Due in 6 in-game days          |
|----------------------------------------------------------------------------|
| WORLD SUMMARY                 | RUNTIME                                    |
| Nations loaded: 42            | Memory: 3.4 GB                             |
| Playable divisions: 8         | Background workers: 5                      |
| Competitions: 97              | Current task: Idle                         |
| Clubs: 740                    | Session uptime: 01:22:18                   |
| Players: 34,516               |                                            |
| Staff: 8,742                  |                                            |
|----------------------------------------------------------------------------|
| VERSIONS                       | SAVE AND INTEGRITY                        |
| Application: 1.4.0            | Active checkpoint: Verified                |
| World schema: 7               | Cloud sync: Synchronized                   |
| Database: Fictional World 1.0 | Recovery required: No                      |
|----------------------------------------------------------------------------|
| [Refresh] [Copy Safe Diagnostic Summary] [Open Save Status]         [Back] |
+----------------------------------------------------------------------------+
```

## 4. Information sections

### Career state

- Career display name and stable identifier suffix.
- Current simulation date and season.
- Active manager and organization.
- Current lifecycle state: idle, processing, match day, saving, loading, paused, waiting for another participant, or recovery required.
- Last safe canonical sequence number.

### Loaded world

- Loaded nations and regions.
- Playable and background competitions.
- Clubs, players, staff, active fixtures, and scheduled events.
- Full, standard, results-only, and essential-detail competition counts.

### Runtime

- Memory represented as an approximate current value and policy budget.
- Worker profile and active worker count.
- Current processing activity.
- Runtime cache state.
- Session uptime based on monotonic time.

### Save state

- Active save identity and revision.
- Last successful save.
- Autosave schedule.
- Pending cloud upload.
- Latest checkpoint integrity.
- Recovery markers.

### Versions

- Application version.
- Engine version.
- World schema version.
- Save format version.
- Database and content-pack fingerprints in expandable technical details.

### Multiplayer

- Host or client authority.
- Connected and disconnected participants.
- Current turn or ready state.
- Server revision and synchronization state.
- Privacy-safe manager ownership summary.

## 5. Status model

```typescript
type CareerRuntimeState =
  | "idle"
  | "waiting_for_input"
  | "processing"
  | "match_in_progress"
  | "saving"
  | "loading"
  | "paused"
  | "waiting_for_participants"
  | "recovering"
  | "error";

interface GameStatusSnapshot {
  readonly careerId: string;
  readonly checkpointId: string;
  readonly canonicalRevision: number;
  readonly careerDate: string;
  readonly runtimeState: CareerRuntimeState;
  readonly worldCounts: WorldEntityCounts;
  readonly competitionDetailCounts: CompetitionDetailCounts;
  readonly resourceSummary: ResourceSummary;
  readonly saveSummary: SaveRuntimeSummary;
  readonly versionSummary: VersionSummary;
  readonly multiplayerSummary?: MultiplayerRuntimeSummary;
  readonly warningCodes: readonly string[];
  readonly capturedAt: string;
}
```

## 6. Refresh behavior

Refresh requests a new immutable status snapshot. It must:

1. Keep the previous snapshot visible.
2. Mark fields as updating.
3. Use a monotonically increasing request revision.
4. Discard stale responses.
5. Avoid blocking simulation.
6. Preserve scroll and focus.

Automatic refresh should use a policy-defined interval and pause when the screen is hidden.

## 7. Safe diagnostic summary

The copy action may include:

- Application and schema versions.
- Career ID suffix.
- Runtime state.
- Entity counts.
- Save integrity state.
- Warning and diagnostic codes.
- Resource summary.

It must exclude:

- Full local paths.
- Authentication tokens.
- Cloud credentials.
- Private manager messages.
- Complete player or staff data.
- Invitation codes.

## 8. Read-only boundary

The screen does not directly alter:

- Competition scope.
- Database size.
- Manager permissions.
- Save contents.
- Worker count.
- Multiplayer authority.

Links navigate to dedicated settings or recovery workflows.

## 9. Warnings

Examples:

```text
Autosave has failed twice. The previous valid save remains available.
```

```text
Cloud synchronization is pending. Local save revision 18 is verified.
```

```text
The career is using 92% of its configured memory budget.
```

Blocking runtime errors should link to a dedicated recovery screen.

## 10. Accessibility

- Use headings for every status group.
- Present label-value data as definition lists.
- Announce runtime state changes politely.
- Do not announce rapidly changing memory values continuously.
- Provide text alongside all status colors and icons.
- Keep Refresh and Back keyboard accessible.
- Support 200% text scaling and right-to-left layout.

## 11. Security

- Build snapshots in a trusted process.
- Validate every returned identifier and count.
- Use safe integer handling.
- Sanitize diagnostic text.
- Never render database or provider data as executable markup.
- Restrict multiplayer information by viewer permission.

## 12. Edge cases

- Career closes while status is open: show a closed-session notice and return safely.
- Save begins during refresh: publish the new state in the next snapshot.
- Cloud provider goes offline: preserve local status and mark remote state unknown.
- Entity count exceeds display range: format safely without overflow.
- Recovery marker appears: prioritize the warning and prevent misleading `Healthy` status.

## 13. Acceptance criteria

1. The screen presents one internally consistent immutable snapshot.
2. Compatibility, runtime, save, resource, and multiplayer states remain distinct.
3. Refresh never mutates the career.
4. Stale refresh results are discarded.
5. Safe diagnostics exclude secrets and private content.
6. Status indicators are not color-only.
7. The screen remains usable during background processing.
8. Multiplayer details obey permissions.
9. Keyboard and assistive-technology users can inspect all sections.
10. No proprietary source-game assets or wording are required.

## 14. Recommended tests

- Snapshot schema validation.
- Stale refresh rejection.
- Save-state transition display.
- Processing-state display.
- Multiplayer privacy filtering.
- Safe diagnostic redaction.
- Large-count formatting.
- Offline cloud state.
- Recovery warning priority.
- Keyboard and screen-reader navigation.

## Suggested Git commit

```text
docs(game-ui): specify game status screen
```
