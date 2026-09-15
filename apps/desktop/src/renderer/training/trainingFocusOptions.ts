import { CATEGORIES, CATEGORY_ATTRIBUTES, type Category } from "@cm-clone/shared";

/**
 * Training Focus presentation rules, shared by the Individual Training Plan (Screen 108), Player
 * Development, and the plan summary card.
 *
 * Pure: no atom, route, or engine import, so every caller and its tests can use them directly.
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

/**
 * The Categories a player may be given as a Training Focus, in `CATEGORIES` order: only those whose
 * Attributes the player actually has. An outfield player carries no goalkeeping Attributes (absent,
 * not zero), so Goalkeeping is not offered to them.
 */
export const offeredTrainingFocuses = (
  attributes: Readonly<Record<string, number | undefined>>,
): ReadonlyArray<Category> =>
  CATEGORIES.filter((category) =>
    CATEGORY_ATTRIBUTES[category].some((attribute) => attributes[attribute] !== undefined),
  );
