/**
 * Static presentation vocabulary for the Style & Appearance panel: the curated avatar palette.
 * Copy and design tokens, not logic.
 */

/** One curated avatar accent scheme. The palette is fixed rather than a colour wheel so contrast is
 *  guaranteed by construction, no colour dependency is added, and a swatch is a stable test target.
 *  Selecting one sets both colours together; `avatarPortraitKey` stays null until portraits ship. */
export interface AvatarOption {
  readonly id: string;
  readonly label: string;
  readonly primary: string;
  readonly secondary: string;
}

export const AVATAR_PALETTE: ReadonlyArray<AvatarOption> = [
  { id: "navy_gold", label: "Navy & Gold", primary: "#0f172a", secondary: "#f59e0b" },
  { id: "crimson_cream", label: "Crimson & Cream", primary: "#7f1d1d", secondary: "#fef3c7" },
  { id: "forest_sky", label: "Forest & Sky", primary: "#14532d", secondary: "#e0f2fe" },
  { id: "royal_white", label: "Royal & White", primary: "#1e3a8a", secondary: "#ffffff" },
  { id: "plum_mint", label: "Plum & Mint", primary: "#4c1d95", secondary: "#a7f3d0" },
  { id: "slate_amber", label: "Slate & Amber", primary: "#334155", secondary: "#fde68a" },
];

export const DEFAULT_AVATAR = AVATAR_PALETTE[0]!;
