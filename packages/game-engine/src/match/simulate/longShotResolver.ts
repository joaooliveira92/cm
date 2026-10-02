import type { MatchEvent } from "../events.js";
import type { ChanceEventBase } from "./chanceTypeResolvers.js";

export const resolveLongShotAction = (base: ChanceEventBase): MatchEvent => ({
  _tag: "LongShot",
  ...base,
});