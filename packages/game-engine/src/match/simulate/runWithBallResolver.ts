import type { MatchEvent } from "../events.js";
import type { ChanceEventBase } from "./chanceTypeResolvers.js";

export const resolveRunWithBallAction = (base: ChanceEventBase): MatchEvent => ({
  _tag: "RunWithBall",
  ...base,
});