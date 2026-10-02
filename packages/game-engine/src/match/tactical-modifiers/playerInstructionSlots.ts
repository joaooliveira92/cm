import type { PlayerInstructions, TeamInstructions } from "@cm-clone/shared";
import type { MatchTactic } from "../types.js";

const getDefaultPlayerInstructions = (): PlayerInstructions => ({
  passing: "team",
  closingDown: "team",
  tackling: "team",
  marking: "team",
  mentality: "team",
  distribution: "default",
  crossFrom: "default",
  crossAim: "default",
  crossBall: "normal",
  longShots: "normal",
  forwardRuns: "normal",
  runWithBall: "normal",
  tryThroughBalls: "normal",
  freeRole: "normal",
  holdUpBall: "normal",
});

export const resolvePlayerInstructionSlots = (
  tactic: MatchTactic,
  index: number,
): PlayerInstructions => {
  const slotInstruction = tactic.slotInstructions?.[index];
  return slotInstruction?.instructions ?? getDefaultPlayerInstructions();
};