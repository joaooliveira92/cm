# Add Manager (Group A, Screen 7)

Source: [07_add_manager.md](../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/07_add_manager.md).

## Why this effort is three tickets and not thirty

The import describes a manager-roster screen: numbered manager slots, local and network managers,
invitations and claims, an ownership and permission model, persisted manager drafts you can resume
or remove, and a career that exists without a manager. Almost none of it has a referent here, and
the reconciliation ledger already says so — its Screen 7 section reads "Nothing of Screen 7
survives."

Two standing decisions do the killing, and neither is reopened by this effort:

- The **blanket scope trim** removes the multiplayer, network, and ownership axis from the whole
  project. See [Agent Note](../../.agents/notes/proposed/process/2026-08-30-group-a-blanket-scope-trim.md).
  That takes §3.4, §3.6, §9–§11, §16–§18, §23, §27 and the network half of §34.
- The **new-game flow sequence** places manager creation *over* world generation rather than after
  it, and persists nothing as a career until the Review step commits. See
  [Agent Note](../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md). That
  takes the screen itself, plus §12–§14 (manager drafts, Resume, Remove) and §20 (the managerless
  career), because a provisional world carries no `save_meta` row and is not a career that could be
  missing a manager.

This game has exactly one manager per career, so §15's capacity policy has nothing to be a policy
about, and §7's slot-row model, §29's empty states, and §30–§31's list semantics have no list to
describe.

What survives is two sections with a real referent in the four-stage creation flow — §21's rule
that Back must not silently discard a generated world, and §22's read-only Career Setup Summary —
plus the ledger reconciliation that shipping them makes necessary.

## Note on the source file

The import file carries an uncommitted edit removing `Invite Network Manager` and
`Multiplayer Settings` from §6.4. The ledger's preamble states that import files are never edited,
because their value is that you can always see what arrived. Ticket 03 records this rather than
reverting it.
