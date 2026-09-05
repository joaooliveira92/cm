/**
 * Deterministic seed derivation: the spine of a reproducible world.
 *
 * A world is generated from one integer world seed. Every entity draws its randomness from a
 * *child* seed derived from that world seed plus the entity's stable identity — `deriveSeed(world,
 * "club", clubName)`, then `deriveSeed(clubSeed, "player", slot)`. Deriving rather than sharing one
 * running stream is what makes generation restartable and locally editable: adding a club, or
 * changing one club's name, moves only that club's players, because no other entity's seed reads
 * from a cursor that entity advanced.
 *
 * The hash is FNV-1a over UTF-16 code units, in integer arithmetic only. No floating point takes
 * part in seed derivation, so the same seed produces the same world on every platform.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a, one byte at a time over each code unit's low then high half. */
const hashString = (input: string, seed: number): number => {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index++) {
    const codeUnit = input.charCodeAt(index);
    hash = Math.imul(hash ^ (codeUnit & 0xff), FNV_PRIME);
    hash = Math.imul(hash ^ (codeUnit >>> 8), FNV_PRIME);
  }
  return hash >>> 0;
};

/**
 * Derives a stable child seed from a parent seed and a path of parts.
 *
 * Parts are length-prefixed before hashing, so the path `["ab", "c"]` cannot collide with
 * `["a", "bc"]` — without that, two differently-structured paths could quietly share a stream.
 *
 * The values this returns are part of a world's identity: changing the hash changes every world
 * generated from a given seed, which is a `RULESET_VERSION` bump rather than a refactor.
 */
export const deriveSeed = (
  parentSeed: number,
  ...parts: readonly (string | number)[]
): number => {
  let hash = hashString(String(parentSeed >>> 0), FNV_OFFSET_BASIS);
  for (const part of parts) {
    const text = String(part);
    hash = hashString(`${text.length}:${text}`, hash);
  }
  return hash >>> 0;
};

const HEX = "0123456789abcdef";

const hex = (value: number, digits: number): string => {
  let out = "";
  for (let shift = (digits - 1) * 4; shift >= 0; shift -= 4) {
    out += HEX[(value >>> shift) & 0xf];
  }
  return out;
};

/**
 * Derives a stable, UUID-shaped identifier from the same seed path a value is generated on.
 *
 * Identity has to be derived alongside the data, or a world is only reproducible up to a renaming:
 * regenerating from the same seed would produce the same players under fresh `randomUUID()` keys,
 * and nothing referencing them by id would survive. The shape stays UUIDv4-compatible (version and
 * variant nibbles set) so persisted id columns and branded id types are unaffected.
 *
 * The four words come from four independently-based hashes of the path rather than from one
 * 32-bit seed expanded by the PRNG. That distinction is load-bearing: an id expanded from a
 * 32-bit seed carries only 32 bits of entropy however long it looks, which across a world's ~500
 * players is roughly a 1-in-30,000 chance of two players colliding on a primary key. Hashing the
 * path four ways gives the id its full width, putting collisions out of reach.
 */
const ID_BASES = [0x811c9dc5, 0x01000193, 0x27220a95, 0x9e3779b9] as const;

export const deriveId = (
  parentSeed: number,
  ...parts: readonly (string | number)[]
): string => {
  const path = [String(parentSeed >>> 0), ...parts.map((part) => String(part))]
    .map((text) => `${text.length}:${text}`)
    .join("");
  const [a, b, c, d] = ID_BASES.map((base) => hashString(path, base)) as [
    number,
    number,
    number,
    number,
  ];
  return [
    hex(a, 8),
    hex(b >>> 16, 4),
    `4${hex(b & 0x0fff, 3)}`,
    hex(0x8000 | (c & 0x3fff), 4),
    hex(c >>> 16, 4) + hex(d, 8),
  ].join("-");
};
