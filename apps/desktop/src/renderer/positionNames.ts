import type { Position } from "@cm-clone/shared";

/** Each Position code's full name, for places with room to spell it out. */
export const POSITION_NAMES: Readonly<Record<Position, string>> = {
  GK: "Goalkeeper",
  DC: "Centre Back",
  DL: "Left Back",
  DR: "Right Back",
  DM: "Defensive Midfielder",
  MC: "Central Midfielder",
  ML: "Left Midfielder",
  MR: "Right Midfielder",
  AMC: "Attacking Midfielder",
  ST: "Striker",
};
