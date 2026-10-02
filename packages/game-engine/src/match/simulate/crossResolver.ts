import type { MatchEvent } from "../events.js";
import type { ChanceEventBase } from "./chanceTypeResolvers.js";

export const resolveCrossAction = (base: ChanceEventBase): MatchEvent => ({
  _tag: "Cross",
  ...base,
});