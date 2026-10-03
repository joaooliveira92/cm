# Screen 253: Multiplayer Lobby

> **Clean-room notice:** Use original content, fictional identities, and properly licensed data only.

---

## 1. Purpose

Multiplayer Lobby coordinates participants before loading or resuming a career, including identities, manager assignments, readiness, content status, latency bands, host controls, and launch blockers.

## 2. Primary user goals

- Review participants, manager assignments, readiness, and compatibility
- Assign permitted open manager slots
- Send invitations or close supported slots
- Start or resume when every hard blocker is resolved

## 3. Navigation context

```text
Global Application Shell
  -> Multiplayer
  -> Multiplayer Lobby
  -> Related lobby, participant, session, checkpoint, or recovery workflow
```

The screen preserves the active session, participant, controlled manager, host epoch, career revision, and navigation history.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| Multiplayer Lobby                                                            |
|------------------------------------------------------------------------------|
| Session state, participants, synchronization, warnings, and actions           |
|                                                                              |
| [Session Views] [Review] [Primary Action] [Leave or Back]                     |
+------------------------------------------------------------------------------+
```

The presentation must be original and must avoid exposing network secrets or private manager decisions.

## 5. Core data model

```typescript
interface MultiplayerAdministrationModel {
  readonly sessionId: string;
  readonly participantId: string;
  readonly controlledManagerIds: readonly string[];
  readonly hostEpoch: number;
  readonly sessionRevision: number;
  readonly careerRevision: number;
  readonly connectionState: MultiplayerConnectionState;
  readonly issues: readonly MultiplayerIssue[];
  readonly permittedActions: readonly MultiplayerAction[];
}
```

Read models are immutable per revision, serializable, permission-filtered, and validated at process or network boundaries.

## 6. Principal interactions

- Review participants, manager assignments, readiness, and compatibility
- Assign permitted open manager slots
- Send invitations or close supported slots
- Start or resume when every hard blocker is resolved

## 7. Session and connection states

- `offline`
- `discovering`
- `joining`
- `lobby`
- `synchronizing`
- `ready`
- `active`
- `away`
- `disconnected`
- `recovering`
- `migrating_host`
- `desynchronized`
- `closing`
- `closed`
- `failed`

Connection state, participant state, manager-control state, and career state remain separate.

## 8. Authority and trust boundaries

- The authoritative server or current host validates every consequential command.
- Session role does not imply control of a club or national team.
- Manager ownership, temporary substitution, spectator access, and host authority are separate capabilities.
- Critical authority uses short-lived leases or equivalent fencing tokens.
- The renderer never decides ownership, permissions, synchronization, or host status.

## 9. Synchronization and deterministic state

- Canonical state is identified by career revision, checkpoint ID, event position, and host epoch.
- Commands include stable IDs, expected revisions, controller authority, and idempotency keys.
- Clients verify snapshots before activation.
- Late, duplicated, reordered, or prior-epoch messages are rejected safely.
- Consequential commands are disabled while a client is desynchronized.

## 10. Continue, readiness, and mandatory decisions

- The continue policy is versioned and authoritative.
- Ready state is invalidated by relevant career changes.
- Private blocker details remain visible only to the owning participant.
- Mandatory decisions cannot be skipped by another participant.
- Time advances once per accepted authoritative continue transaction.

## 11. Reconnect and host migration

- Reconnect authenticates the participant and revalidates client compatibility.
- Recovery uses a verified snapshot plus an ordered event tail.
- Host migration uses a new epoch and prevents split-brain authority.
- Manager control is restored only after synchronization completes.
- Recovery and migration are resumable, bounded, and idempotent.

## 12. Checkpoints and restoration

- Multiplayer checkpoints are created only from authoritative state.
- Writes are atomic, checksummed, and verified before becoming restorable.
- Restore is a session-wide destructive workflow with explicit confirmation and coordination.
- Retention, deletion, and replication follow named policies.
- Local caches are never presented as authoritative saves.

## 13. Privacy and moderation

- Invitations, tokens, addresses, credentials, device identifiers, and private decisions are protected.
- Moderation uses constrained professional reason codes and auditable authority.
- Removal, departure, spectator conversion, and abandoned-manager continuity are distinct.
- Chat safety and communication controls remain separate from career authority.
- Diagnostics and exports use privacy-safe identifiers.

## 14. Validation and recovery

Distinguish authentication failure, incompatible version, content mismatch, full session, stale revision, ownership conflict, permission loss, desynchronization, checkpoint corruption, host migration timeout, and operational failure. Preserve verified state and offer Retry, Resynchronize, Reconnect, Review Changes, Leave, or Return.

## 15. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Expose participants, roles, readiness, synchronization, checkpoints, and history through accessible lists, grids, forms, headings, and status regions.
- Announce connection loss, host migration, readiness changes, and recovery progress politely.
- Never communicate role, latency, readiness, or synchronization by color alone.
- Avoid rapidly repeating network-status announcements.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.

## 16. Localization requirements

- Localize session states, role names, reasons, dates, durations, sizes, deadlines, and plural forms.
- Preserve stable session, participant, manager, role, checkpoint, host-epoch, and event IDs.
- Preserve structured display names and native scripts.
- Use complete session messages rather than concatenated fragments.
- Host-client and joined-left semantics remain clear in right-to-left layouts.

## 17. Responsive behavior

- Wide layouts may combine participant list, session detail, synchronization, and actions.
- Narrow layouts stack status, participants, warnings, and actions.
- Long compatibility and recovery explanations wrap safely.
- Primary Join, Ready, Start, Reconnect, Transfer Host, Restore, Leave, and Back actions remain reachable.
- Ultrawide displays use bounded working widths.

## 18. Performance requirements

- Keep networking, authentication, checksum, snapshot, replay, and permission logic outside the renderer.
- Stream compact progress and session events.
- Cancel obsolete joins, syncs, and diagnostics.
- Virtualize long checkpoint and audit histories.
- Rate-limit presence, latency, and readiness updates.
- Cache only encrypted or permission-safe data keyed by session, participant, epoch, and revision.

## 19. Security and integrity requirements

- Treat invitations, names, chat-adjacent labels, diagnostics, manifests, and network payloads as untrusted.
- Validate every session, participant, manager, role, checkpoint, epoch, event, and action ID.
- Use secure transport and trusted authentication appropriate to the deployment.
- Never expose or log session secrets, tokens, addresses, or credentials.
- Never trust renderer-calculated authority, readiness, checksums, compatibility, or synchronization state.
- Sanitize exports, crash reports, and diagnostics.

## 20. Screen-specific rules

- Exact network addresses are never exposed
- Ready state is revision-bound
- The host cannot start with unresolved mandatory incompatibility
- Latency is shown as a band and not used to shame participants

## 21. Persistence rules

Persist authoritative session configuration, participant membership, role and ownership events, continue policies, verified checkpoints, migrations, moderation outcomes, and audit events. Persist local presentation preferences separately. Do not persist plaintext secrets, unverified snapshots, stale presence, or renderer authority decisions.

## 22. Observability

Record session-state transitions, latency bands, sync durations, checkpoint verification, reconnect categories, migration outcomes, and safe error codes. Avoid recording addresses, tokens, private manager decisions, chat content, complete identities, or save payloads.

## 23. Edge cases

- Two participants attempt to control the same manager.
- A participant disconnects during a mandatory workflow.
- The host disappears while a checkpoint is being written.
- A client rejoins with an old host epoch.
- Content or client versions change between sessions.
- A restore is requested while another command is in flight.
- The same command is submitted twice.
- Migration succeeds after the old host reconnects.

## 24. Acceptance criteria

1. Exact network addresses are never exposed
2. Ready state is revision-bound
3. The host cannot start with unresolved mandatory incompatibility
4. Latency is shown as a band and not used to shame participants
5. The view is bound to explicit session, participant, host-epoch, session, and career revisions.
6. Connection, participant, manager-control, host, synchronization, and career states remain distinct.
7. All consequential multiplayer operations are authenticated, revision-bound, and idempotent.
8. Keyboard and assistive-technology users can access every state, warning, and action.
9. No proprietary source-game assets, wording, likenesses, secrets, or database records are required.

## 25. Recommended tests

- Normal create, join, ready, and resume workflow.
- Incompatible version or content manifest.
- Simultaneous manager-control claim.
- Disconnect during a mandatory decision.
- Desynchronization and verified snapshot recovery.
- Host loss and split-brain-safe migration.
- Checkpoint interruption and restore coordination.
- Duplicate or prior-epoch command.
- Keyboard and screen-reader flow.
- High scaling and right-to-left layout.

## 26. Condensed LLM implementation brief

```text
Implement Multiplayer Lobby for an original football-management simulation. Use stable
session, participant, manager, role, permission, checkpoint, event, command, and
host-epoch IDs; strict separation of session roles from career authority;
authoritative authenticated commands; immutable revisions; verified snapshots
and ordered event replay; deterministic readiness and continue policies;
split-brain-safe host migration; privacy-safe moderation and audit; and
idempotent revision-bound operations. Disable consequential actions while a
client is desynchronized. Never trust renderer-calculated ownership, readiness,
checksums, compatibility, permissions, or connection authority. Support keyboard
operation, accessible status and participant lists, visible focus, high text
scaling, localization, and right-to-left layouts. Treat names, invitations,
manifests, diagnostics, IDs, and network payloads as untrusted. Do not copy
proprietary artwork, exact wording, source code, logos, likenesses, or databases.
```

## Suggested Git commit

```text
docs(game-ui): specify multiplayer lobby screen
```
