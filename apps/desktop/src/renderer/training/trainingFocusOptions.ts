import type { Category } from "@cm-clone/shared";

/**
 * Training Focus presentation rules, shared by the Individual Training Plan (Screen 108), Player
 * Development, and the plan summary card.
 *
 * Pure: no atom, route, or engine import, so every caller and its tests can use them directly. Which
 * Categories a player is offered is a game rule, not presentation: `offeredTrainingFocuses` in
 * `@cm-clone/shared`, the same predicate the `setTrainingFocus` command enforces.
 */

/** A player's Training Focus as the wire carries it — a Category, or `null` for None. */
export type TrainingFocusValue = Category | null;

const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  technical: "Technical",
  mental: "Mental",
  physical: "Physical",
  goalkeeping: "Goalkeeping",
};

/** The label a Training Focus reads as. None is a first-class value, never a blank. */
export const trainingFocusLabel = (focus: TrainingFocusValue): string =>
  focus === null ? "None" : CATEGORY_LABELS[focus];
