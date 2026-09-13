# Group R reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records every
place the import is knowingly not followed, and why. Its format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots and
the [Group B ledger](../group_b_global_navigation_and_inbox/RECONCILIATION.md) extends. The import files
are never edited.

**The whole group is disposed in full, and it is one ruling applied thirteen times.** Every screen
administers a multiplayer session: participants, hosts, lobbies, roles, readiness, synchronization,
reconnects, host migration, shared checkpoints and moderation. The multiplayer, network and
multi-manager axis was removed wholesale from this project at Group A, and
[`CONTEXT.md`](../../../CONTEXT.md)'s **Save** entry fixes exactly one human manager per Save. The
Group B ledger's section *The multiplayer axis* sets out that ruling and it is not re-argued here. No
screen has residue on another axis, so no section-by-section pass is owed.

The index's functional flow also names *Multiplayer Session History and Audit*, which would be Screen
263. No file for it arrived, so there is no row for it. It would fall under the same ruling.

## How to read a row

Rows use the Group B ledger's fields and kinds. Every row here is `out-of-scope`, and every status is
`Disposed in full`: the screen was ruled out as a whole file, its one row disposes of every section,
and nothing is left silent.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 250 Multiplayer Centre | [250_multiplayer_centre.md](250_multiplayer_centre.md) | Disposed in full |
| 251 Create Multiplayer Career | [251_create_multiplayer_career.md](251_create_multiplayer_career.md) | Disposed in full |
| 252 Join Multiplayer Career | [252_join_multiplayer_career.md](252_join_multiplayer_career.md) | Disposed in full |
| 253 Multiplayer Lobby | [253_multiplayer_lobby.md](253_multiplayer_lobby.md) | Disposed in full |
| 254 Participant and Manager Administration | [254_participant_and_manager_administration.md](254_participant_and_manager_administration.md) | Disposed in full |
| 255 Multiplayer Roles and Permissions | [255_multiplayer_roles_and_permissions.md](255_multiplayer_roles_and_permissions.md) | Disposed in full |
| 256 Game Speed and Continue Policy | [256_game_speed_and_continue_policy.md](256_game_speed_and_continue_policy.md) | Disposed in full |
| 257 Ready State and Turn Coordination | [257_ready_state_and_turn_coordination.md](257_ready_state_and_turn_coordination.md) | Disposed in full |
| 258 Network Synchronization Status | [258_network_synchronization_status.md](258_network_synchronization_status.md) | Disposed in full |
| 259 Reconnect and Session Recovery | [259_reconnect_and_session_recovery.md](259_reconnect_and_session_recovery.md) | Disposed in full |
| 260 Host Transfer and Migration | [260_host_transfer_and_migration.md](260_host_transfer_and_migration.md) | Disposed in full |
| 261 Multiplayer Save and Checkpoint Management | [261_multiplayer_save_and_checkpoint_management.md](261_multiplayer_save_and_checkpoint_management.md) | Disposed in full |
| 262 Participant Removal and Session Moderation | [262_participant_removal_and_session_moderation.md](262_participant_removal_and_session_moderation.md) | Disposed in full |

## Disposals

Every row's Anchor is the same: the multiplayer, network and multi-manager axis, removed wholesale at
Group A and disposed under *The multiplayer axis* in the Group B ledger, resting on `CONTEXT.md`'s
**Save** entry. Any of these returns only if a Save gains more than one human manager. That would be
a new effort against a redrawn scope, not a resumption of this ledger.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| 250, §1–end — the whole file | `out-of-scope` | A hub for active sessions, invitations, participants, connectivity, synchronization, checkpoints and host alerts. | No session exists to list. Careers are opened from the Main Menu and Load Career (Group A). | The multiplayer axis. |
| 251, §1–end — the whole file | `out-of-scope` | Configure a networked career: host authority, visibility, invitations, participant limits, timing and migration policy. | Career creation is the single-manager New Game flow (Group A, Screens 2–12). | The multiplayer axis. |
| 252, §1–end — the whole file | `out-of-scope` | Join via an invitation, with identity, version, content-manifest and manager-slot checks. | Nothing to join and no second client. | The multiplayer axis. |
| 253, §1–end — the whole file | `out-of-scope` | A pre-launch lobby of participants, manager assignments, readiness, latency and host controls. | No participants to gather. | The multiplayer axis. |
| 254, §1–end — the whole file | `out-of-scope` | Assign, release and transfer manager control among participants, substitutes and spectators. | One manager, permanently bound to the one human. | The multiplayer axis. |
| 255, §1–end — the whole file | `out-of-scope` | Host, co-host, participant, spectator and administrator capabilities. | One participant holds every right, so there is no role to assign. | The multiplayer axis; see *The permission context* in the Group B ledger. |
| 256, §1–end — the whole file | `out-of-scope` | Shared timing policy: pause rights, continue deadlines, absence and timeout profiles, automatic advancement. | Everything here coordinates several humans' advancement. Single-player advancement is **Continue** and is owned by Screen 23 in Group B, so disposing of this file removes no single-player control. | The multiplayer axis. |
| 257, §1–end — the whole file | `out-of-scope` | Per-participant ready state, blockers, extension requests and turn coordination. | The single manager's blockers before advancing are **Readiness Blocker**s, surfaced by Continue (Screen 23), not a turn system. | The multiplayer axis. |
| 258, §1–end — the whole file | `out-of-scope` | Connection health, acknowledged career revision, pending events, snapshots and desync recovery. | No network, and no revision to acknowledge. | The multiplayer axis; see *The career revision* in the Group B ledger. |
| 259, §1–end — the whole file | `out-of-scope` | Authenticated re-entry, snapshot or event replay, and manager-control restoration after disconnect. | Nothing to disconnect from. Crash recovery of a local Save is persistence's concern, not this screen's. | The multiplayer axis. |
| 260, §1–end — the whole file | `out-of-scope` | Move session authority to another participant or server, planned or after host loss. | No host. | The multiplayer axis. |
| 261, §1–end — the whole file | `out-of-scope` | Authoritative session checkpoints with verification, retention and session-wide restore. | Saving is the single-player Save and Save As flow (Group A, Screens 13–15). | The multiplayer axis. |
| 262, §1–end — the whole file | `out-of-scope` | Departure, inactivity handling, removal, restriction and continuity for abandoned managers. | No participant to remove. | The multiplayer axis. |
