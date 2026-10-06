import { Schema } from "effect";

/** Rejection reasons for `SetKeyBindingOverride` (ticket 14). The renderer's override validator
 *  (`apps/desktop/src/renderer/actions/overrides.ts`) is the enforcement point and produces these
 *  tagged errors; main re-checks the string-level guards (shape, locked key) before persisting, so
 *  they also cross the wire as typed failures. The renderer/help-overlay renders the reason from
 *  the tag + payload. */

/** Raised when the target Action's effective binding is a locked infra key (`Escape`,
 *  `Primary+K`, `Primary+/`, `Enter`) — the architectural keys are non-rebindable (ticket 14) —
 *  or when the *new* binding *is* one of those keys (nothing else may claim them). */
export class LockedKeyOverrideError extends Schema.TaggedError<LockedKeyOverrideError>()(
  "LockedKeyOverrideError",
  {
    actionId: Schema.String,
    binding: Schema.String,
  },
) {}

/** Raised when the new binding equals the effective binding of a *different* Action live in the
 *  same scope tier — the conflicting Action is named so the rejection can say which one. */
export class CollidingOverrideError extends Schema.TaggedError<CollidingOverrideError>()(
  "CollidingOverrideError",
  {
    actionId: Schema.String,
    binding: Schema.String,
    conflictingActionId: Schema.String,
  },
) {}

/** Raised when the binding string is not a shape the keyboard framework can express (a bare key,
 *  a `Primary+` chord, a `g <key>` two-step, or `Space`) — e.g. `Enter`-free modifiers, arrows,
 *  function keys, or a lone `g` (the prefix initiator is reserved). */
export class InvalidBindingShapeError extends Schema.TaggedError<InvalidBindingShapeError>()(
  "InvalidBindingShapeError",
  {
    actionId: Schema.String,
    binding: Schema.String,
  },
) {}
