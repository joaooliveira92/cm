/**
 * The club half of a badge key (`eng/brighton-hove-albion`): the club's name with accents removed,
 * lowercased, and every other non-alphanumeric run turned into one `-`.
 *
 * Source filenames are display strings with accents, spaces, `&`, dots and apostrophes, so code never
 * addresses a badge by one. Unicode decomposition strips most accents, but a few letters (`ø`, `ß`,
 * `ł`, ...) are whole letters with no mark to strip; those are transliterated, or `Tromsø` would
 * split into `troms-`.
 */
const WHOLE_LETTERS: Readonly<Record<string, string>> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
};

export const badgeSlug = (clubName: string): string =>
  clubName
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[øæœßłđðþı]/gu, (letter) => WHOLE_LETTERS[letter] ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
