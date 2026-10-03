import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type-scale roles declared as `--text-*` in `index.css`. tailwind-merge
 * reads any unknown `text-*` as a colour, so without this `cn("text-heading",
 * "text-text-secondary")` would drop one of the two as a colour conflict.
 */
export const TEXT_ROLES = [
  "display",
  "title",
  "figure",
  "heading",
  "body",
  "data",
  "label",
  "caption",
  "overline",
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...TEXT_ROLES] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
