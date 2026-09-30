/**
 * How well a player suits the slot he stands in: his Familiarity Tier, derived on the main side
 * from Suitability. Shown as a word, not a colour alone, and never as the positional ratings behind
 * it, which no screen shows. See the Agent Note
 * `.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md`.
 */
import type { FamiliarityTier } from "@cm-clone/shared";

const FIT_LABEL: Readonly<Record<FamiliarityTier, string>> = {
  natural: "Natural",
  competent: "Competent",
  unfamiliar: "Unfamiliar",
};

const FIT_TONE: Readonly<Record<FamiliarityTier, string>> = {
  natural: "font-semibold text-text-highlight",
  competent: "text-text-secondary",
  unfamiliar: "font-semibold text-text-warning",
};

export const FitIndicator = ({ tier }: { readonly tier: FamiliarityTier | null }) =>
  tier === null ? <span className="text-text-muted">-</span> : <span className={FIT_TONE[tier]}>{FIT_LABEL[tier]}</span>;
