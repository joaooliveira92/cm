import { Schema } from "effect";
import {
  FORMATIONS,
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  ROLES,
  TEMPO_OPTIONS,
} from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { PlayerId, SaveId, WriteRequestId } from "./ids.js";
import { PositionSchema, SquadPlayerView } from "./squad.js";

export const FormationSchema = Schema.Literals(FORMATIONS);
export const RoleSchema = Schema.Literals(ROLES);
export const MentalitySchema = Schema.Literals(MENTALITY_OPTIONS);
export const TempoSchema = Schema.Literals(TEMPO_OPTIONS);
export const PressingSchema = Schema.Literals(PRESSING_OPTIONS);

export class TacticSlot extends Schema.Class<TacticSlot>("TacticSlot")({
  position: PositionSchema,
  role: RoleSchema,
  playerId: PlayerId,
}) {}

/** The `ChangeTactics` command payload shape (ADR-0003 / ticket 03): a Formation, a Role and
 * player per slot, and the 3 Team Instructions. */
export class Tactic extends Schema.Class<Tactic>("Tactic")({
  formation: FormationSchema,
  slots: Schema.Array(TacticSlot),
  mentality: MentalitySchema,
  tempo: TempoSchema,
  pressing: PressingSchema,
}) {}

export class InvalidTacticError extends Schema.TaggedError<InvalidTacticError>()(
  "InvalidTacticError",
  {
    reason: Schema.String,
  },
) {}

/**
 * Raised when a `changeTactics` submit's `expectedRevision` no longer matches the stored revision,
 * so the caller offered a stale write. Names the revision that won the race so a caller can offer
 * Refresh rather than guessing. A replay carrying an already-seen `requestId` never raises this —
 * it is a no-op success. See the revision-and-idempotency note.
 */
export class TacticRevisionConflictError extends Schema.TaggedError<TacticRevisionConflictError>()(
  "TacticRevisionConflictError",
  {
    saveId: SaveId,
    currentRevision: Schema.Natural,
  },
) {}

/**
 * The `changeTactics` command payload: the Tactic to write, the `expectedRevision` the caller
 * read, and a fresh `requestId` per submit. A submit whose revision is stale fails with a typed
 * conflict; a replay of an already-accepted `requestId` is a no-op that returns the current state.
 */
export class ChangeTacticsPayload extends Schema.Class<ChangeTacticsPayload>(
  "ChangeTacticsPayload",
)({
  saveId: SaveId,
  tactic: Tactic,
  expectedRevision: Schema.Natural,
  requestId: WriteRequestId,
}) {}

export class TacticsScreenView extends Schema.Class<TacticsScreenView>("TacticsScreenView")({
  club: ClubSummary,
  squad: Schema.Array(SquadPlayerView),
  tactic: Schema.NullOr(Tactic),
  /** The club tactic's monotonically increasing revision, from 0 (never saved) upward. Both
   *  `getTactics` and an accepted `changeTactics` echo the revision their value was read at, so a
   *  caller that later learns a larger revision knows its read is stale. */
  revision: Schema.Natural,
}) {}
