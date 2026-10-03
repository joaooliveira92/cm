/**
 * The one module that knows the backdrop library's folder and turns a context key into an image URL.
 *
 * The library is `apps/desktop/assets/`, outside the Vite renderer root; `import.meta.glob` resolves
 * it at build time the same way `clubBadges.ts` resolves the badges, with `?url` so each entry is the
 * emitted file's URL rather than a content module. Any raster format Chromium decodes is accepted,
 * so a new photograph needs no code change.
 */
import { compareCodeUnits } from "@cm-clone/shared";

const modules: Record<string, string> = import.meta.glob(
  "../../../assets/*.{avif,jpeg,jpg,png,webp}",
  { eager: true, query: "?url", import: "default" },
);

/** Sorted by source path so a given key picks the same photograph on every build. */
const LIBRARY: ReadonlyArray<string> = Object.keys(modules)
  .sort(compareCodeUnits)
  .map((path) => modules[path] as string);

/** FNV-1a over UTF-16 code units: stable, dependency-free, and well spread for short keys. */
const hash = (key: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * The photograph for a context key, chosen deterministically from `library`, or null when the
 * library is empty. The same key always lands on the same image, so a career keeps its backdrop
 * across sessions while different careers (and the menu) get different ones.
 */
export const pickBackdrop = (library: ReadonlyArray<string>, key: string): string | null =>
  library.length === 0 ? null : (library[hash(key) % library.length] ?? null);

/** `pickBackdrop` over the bundled library. */
export const backdropFor = (key: string): string | null => pickBackdrop(LIBRARY, key);

/** The shared backdrop of the shells outside a career: main menu, load, and creation. */
export const MENU_BACKDROP = backdropFor("menu");
