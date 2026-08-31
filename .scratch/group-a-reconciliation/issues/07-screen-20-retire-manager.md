# 07 — Screen 20: Retire Manager

Type: grilling
Status: open
Blocked by: 06

## Question

Settled on the map: retirement is voluntary termination reusing the existing sacked-archive path,
differing in cause and messaging only. What remains is the design.

- **Event and state**: a new event tag alongside `ManagerSacked`, or a shared termination event carrying
  a cause. `ManagerOutcome` and the `manager_status` table both need a value for it, and `assertSaveNotSacked`
  is the guard that must reject commands afterwards — its name stops being accurate if retirement shares
  the path.
- **Confirmation strength**: spec 20 wants an acknowledgement checkbox plus a distinct confirm button.
  Whether that survives, given the repo's existing Irreversibility Disclosure vocabulary in `CONTEXT.md`.
- **Entry point**: reached from the Screen 19 manager screen, from the shell, or both.
- **Afterwards**: what the player sees once retired, and how it differs from the sacked banner on the
  season summary screen.
- **Preconditions**: spec 20 §4 lists seven. Most concern multiplayer authority and are trimmed; what
  is left is probably "not mid-match" and "not already terminated" — confirm against the decider's
  safe-boundary rules.

Spec 20 §6 (interim AI manager, club continuity) is out of scope by the map's standing decision; the
register needs an entry saying so.

## Done when

The event, the guard's treatment, the screen, and the post-retirement state are specified.