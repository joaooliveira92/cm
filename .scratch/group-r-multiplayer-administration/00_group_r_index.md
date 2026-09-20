# Group R: Multiplayer Administration

## Package contents

- [Screen 250: Multiplayer Centre](250_multiplayer_centre.md)
- [Screen 251: Create Multiplayer Career](251_create_multiplayer_career.md)
- [Screen 252: Join Multiplayer Career](252_join_multiplayer_career.md)
- [Screen 253: Multiplayer Lobby](253_multiplayer_lobby.md)
- [Screen 254: Participant and Manager Administration](254_participant_and_manager_administration.md)
- [Screen 255: Multiplayer Roles and Permissions](255_multiplayer_roles_and_permissions.md)
- [Screen 256: Game Speed and Continue Policy](256_game_speed_and_continue_policy.md)
- [Screen 257: Ready State and Turn Coordination](257_ready_state_and_turn_coordination.md)
- [Screen 258: Network Synchronization Status](258_network_synchronization_status.md)
- [Screen 259: Reconnect and Session Recovery](259_reconnect_and_session_recovery.md)
- [Screen 260: Host Transfer and Migration](260_host_transfer_and_migration.md)
- [Screen 261: Multiplayer Save and Checkpoint Management](261_multiplayer_save_and_checkpoint_management.md)
- [Screen 262: Participant Removal and Session Moderation](262_participant_removal_and_session_moderation.md)

## Functional flow

```text
Multiplayer Centre
  -> Create or Join Multiplayer Career
      -> Multiplayer Lobby
  -> Participant and Manager Administration
      -> Roles and Permissions
      -> Removal and Moderation
  -> Game Speed, Continue Policy, and Ready Coordination
  -> Network Synchronization
      -> Reconnect and Session Recovery
      -> Host Transfer and Migration
  -> Multiplayer Save and Checkpoint Management
  -> Multiplayer Session History and Audit
```

## Shared requirements

- Strict separation of session roles, participant identity, and manager control.
- Authenticated authoritative commands with revisions and idempotency.
- Verified checkpoints, snapshots, ordered event replay, and host epochs.
- Split-brain-safe host migration and resumable reconnect recovery.
- Privacy-safe moderation, diagnostics, and audit history.

## Suggested Git commit

```text
docs(game-ui): add multiplayer administration specifications
```
