/**
 * The halftime instruction toggle every live command surface shares: the Match day panel and the
 * standalone Match Tactics and Substitutions screens. It is offered only while the reveal stands at
 * half time (`getAtHalfTime`), and a box ticked then clears once the window closes, so a command sent
 * later is never read as a halftime instruction.
 */
import { useState } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { getAtHalfTime } from "./session.js";

export interface HalftimeInstruction {
  /** True only while the reveal stands at half time. */
  readonly atHalftime: boolean;
  /** Whether the next command is a halftime instruction: ticked, and still at half time. */
  readonly isHalftime: boolean;
  readonly setIsHalftime: (value: boolean) => void;
}

export const useHalftimeInstruction = (saveId: SaveId): HalftimeInstruction => {
  const atHalftime = getAtHalfTime(saveId);
  const [checked, setChecked] = useState(false);
  // Cleared while rendering, not in an effect, so a tick can never be held over into the window:
  // without it a state set while the box was disabled would show ticked the moment half time opens.
  if (checked && !atHalftime) setChecked(false);
  return { atHalftime, isHalftime: checked && atHalftime, setIsHalftime: setChecked };
};
