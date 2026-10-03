import type { MatchEvent } from "../events.js";
import type { ChanceEventBase } from "./chanceTypeResolvers.js";

export const resolveThroughBallAction = (base: ChanceEventBase): MatchEvent => ({
  _tag: "ThroughBall",
  ...base,
});