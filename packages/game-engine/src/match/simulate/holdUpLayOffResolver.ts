import type { MatchEvent } from "../events.js";
import type { ChanceEventBase } from "./chanceTypeResolvers.js";

export const resolveHoldUpLayOffAction = (base: ChanceEventBase): MatchEvent => ({
  _tag: "HoldUpLayOff",
  ...base,
});