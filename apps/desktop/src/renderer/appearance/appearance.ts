/**
 * The renderer's appearance: shadcn's two colour axes, a base color and a theme
 * color, chosen independently in Preferences.
 *
 * The palettes themselves live in `palettes.css`, keyed on two attributes on
 * `<html>`. This module owns the option lists, the persisted choice, and the
 * write onto those attributes. Every role token in `index.css` resolves through
 * the palette variables, so writing the attributes repaints the whole renderer
 * with no re-render.
 *
 * Persistence is renderer-local `localStorage`, beside the column and squad-view
 * preferences: how the app looks is a standing preference of whoever sits at
 * this machine, not part of any save.
 */

export interface AppearanceOption<Id extends string> {
  readonly id: Id;
  readonly label: string;
  /** The option's dark-mode primary, for the picker's swatch. */
  readonly swatch: string;
}

export const BASE_COLORS = [
  { id: "neutral", label: "Neutral", swatch: "oklch(0.922 0 0)" },
  { id: "stone", label: "Stone", swatch: "oklch(0.923 0.003 48.717)" },
  { id: "zinc", label: "Zinc", swatch: "oklch(0.92 0.004 286.32)" },
  { id: "mauve", label: "Mauve", swatch: "oklch(0.922 0.005 325.62)" },
  { id: "olive", label: "Olive", swatch: "oklch(0.93 0.007 106.5)" },
  { id: "mist", label: "Mist", swatch: "oklch(0.925 0.005 214.3)" },
  { id: "taupe", label: "Taupe", swatch: "oklch(0.922 0.005 34.3)" },
] as const satisfies ReadonlyArray<AppearanceOption<string>>;

/**
 * "neutral" is the no-override theme: it keeps whatever primary the base color
 * carries, so Stone + Neutral is a warm grey primary rather than a pure one.
 */
export const THEME_COLORS = [
  { id: "neutral", label: "Neutral", swatch: "oklch(0.922 0 0)" },
  { id: "amber", label: "Amber", swatch: "oklch(0.473 0.137 46.201)" },
  { id: "blue", label: "Blue", swatch: "oklch(0.424 0.199 265.638)" },
  { id: "cyan", label: "Cyan", swatch: "oklch(0.45 0.085 224.283)" },
  { id: "emerald", label: "Emerald", swatch: "oklch(0.432 0.095 166.913)" },
  { id: "fuchsia", label: "Fuchsia", swatch: "oklch(0.452 0.211 324.591)" },
  { id: "green", label: "Green", swatch: "oklch(0.448 0.119 151.328)" },
  { id: "indigo", label: "Indigo", swatch: "oklch(0.398 0.195 277.366)" },
  { id: "lime", label: "Lime", swatch: "oklch(0.768 0.233 130.85)" },
  { id: "orange", label: "Orange", swatch: "oklch(0.47 0.157 37.304)" },
  { id: "pink", label: "Pink", swatch: "oklch(0.459 0.187 3.815)" },
  { id: "purple", label: "Purple", swatch: "oklch(0.438 0.218 303.724)" },
  { id: "red", label: "Red", swatch: "oklch(0.444 0.177 26.899)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.455 0.188 13.697)" },
  { id: "sky", label: "Sky", swatch: "oklch(0.443 0.11 240.79)" },
  { id: "teal", label: "Teal", swatch: "oklch(0.437 0.078 188.216)" },
  { id: "violet", label: "Violet", swatch: "oklch(0.432 0.232 292.759)" },
  { id: "yellow", label: "Yellow", swatch: "oklch(0.795 0.184 86.047)" },
] as const satisfies ReadonlyArray<AppearanceOption<string>>;

export type BaseColorId = (typeof BASE_COLORS)[number]["id"];
export type ThemeColorId = (typeof THEME_COLORS)[number]["id"];

export interface Appearance {
  readonly baseColor: BaseColorId;
  readonly themeColor: ThemeColorId;
}

export const DEFAULT_APPEARANCE: Appearance = { baseColor: "neutral", themeColor: "neutral" };

export const APPEARANCE_STORAGE_KEY = "@cm-clone/desktop:appearance";

const isBaseColorId = (value: unknown): value is BaseColorId =>
  BASE_COLORS.some((option) => option.id === value);

const isThemeColorId = (value: unknown): value is ThemeColorId =>
  THEME_COLORS.some((option) => option.id === value);

/**
 * The stored appearance, reconciled field by field: an unknown or corrupt value
 * reads as that axis's default rather than leaving the renderer unpainted. A
 * throwing `localStorage` (disabled, quota) reads as the default too — a
 * cosmetic preference must never block boot.
 */
export const loadAppearance = (storage: Storage = window.localStorage): Appearance => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(APPEARANCE_STORAGE_KEY) ?? "null");
  } catch {
    return DEFAULT_APPEARANCE;
  }
  if (typeof parsed !== "object" || parsed === null) return DEFAULT_APPEARANCE;
  const record = parsed as Record<string, unknown>;
  return {
    baseColor: isBaseColorId(record.baseColor) ? record.baseColor : DEFAULT_APPEARANCE.baseColor,
    themeColor: isThemeColorId(record.themeColor)
      ? record.themeColor
      : DEFAULT_APPEARANCE.themeColor,
  };
};

export const saveAppearance = (
  appearance: Appearance,
  storage: Storage = window.localStorage,
): void => {
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // The choice still applies for this session; it just won't survive restart.
  }
};

/** Point `palettes.css` at the chosen pair. */
export const applyAppearance = (
  appearance: Appearance,
  root: HTMLElement = document.documentElement,
): void => {
  root.dataset.baseColor = appearance.baseColor;
  root.dataset.themeColor = appearance.themeColor;
};
