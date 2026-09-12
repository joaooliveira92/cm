/**
 * The one module that knows the badge library's folder and turns a badge key into a URL.
 *
 * The library is bundled through Vite (the renderer is Vite-built), so the map is produced at build
 * time by `import.meta.glob`. Each matching file is given `?url` so Vite returns the file's URL
 * string rather than its content module — the renderer presents the URL to an `<img>` and the
 * browser loads it.
 *
 * Vite also compresses the PNGs at build time (copy plugin, not transform), so the output
 * directory has the same layout with smaller files.
 */
import type { BadgeKey } from "@cm-clone/shared";

const BADGE_PREFIX = "./club-badges/";
const BADGE_SUFFIX = ".png";

const modules: Record<string, string> = import.meta.glob(
  "./club-badges/*/*.png",
  { eager: true, query: "?url", import: "default" },
);

const KEY_TO_URL: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const key = path.slice(BADGE_PREFIX.length, -BADGE_SUFFIX.length);
  KEY_TO_URL[key] = url as string;
}

/**
 * The URL for a badge key, or null when the key is unknown (not in the library's manifest).
 * A caller that holds a null badgeKey should not call this — it draws the fallback shield instead
 * — but unknown keys produce null so the caller handles both gap paths identically.
 */
export const badgeUrl = (badgeKey: BadgeKey): string | null =>
  KEY_TO_URL[badgeKey] ?? null;