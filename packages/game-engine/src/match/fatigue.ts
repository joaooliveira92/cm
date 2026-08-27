import type { MatchPlayerInput } from "./types.js";

const FATIGUE_START_MINUTE = 60;
const BASE_FATIGUE_RATE_PER_MINUTE = 0.004;
const MIN_FATIGUE_MULTIPLIER = 0.7;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const averageStamina = (players: ReadonlyArray<MatchPlayerInput>): number =>
  players.length === 0 ? 10 : players.reduce((sum, player) => sum + player.attributes.stamina, 0) / players.length;

/**
 * Fatigue decay multiplier (ADR-0002) applied to Midfield/Defense Phase Strength from minute ~60,
 * scaled inversely by squad-average Stamina (1-20) and by the Pressing instruction's fatigue decay
 * rate (ADR-0003: High pressing doubles it). Resets per match by construction — it's a pure
 * function of the current minute, not accumulated state.
 */
export const fatigueMultiplier = (
  minute: number,
  averageStaminaValue: number,
  fatigueDecayMultiplier: number,
): number => {
  if (minute <= FATIGUE_START_MINUTE) return 1;
  const minutesPastThreshold = minute - FATIGUE_START_MINUTE;
  const staminaFactor = clamp((21 - averageStaminaValue) / 20, 0.05, 1);
  const decay = minutesPastThreshold * BASE_FATIGUE_RATE_PER_MINUTE * fatigueDecayMultiplier * staminaFactor;
  return clamp(1 - decay, MIN_FATIGUE_MULTIPLIER, 1);
};
