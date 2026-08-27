import type { RandomSource } from "@cm-clone/shared";

/**
 * Deterministic PRNG (mulberry32) seeded by a single integer. The match engine draws every random
 * value from one instance per match (ADR-0002) so the entire event timeline is reproducible from
 * the `MatchStarted` seed and the sequence of commands applied against it.
 */
export const createSeededRng = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return {
    next: (): number => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
};

export const pickRandom = <T>(items: ReadonlyArray<T>, random: RandomSource): T =>
  items[Math.floor(random.next() * items.length)] as T;

export type Rng = RandomSource;

const hashSeed = (seed: number, key: string): number => {
  let hash = seed >>> 0;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 2654435761);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
};

/**
 * Derives an independent, deterministic sub-stream from a base seed and a string path (ADR-0002's
 * "splittable PRNG") — lets independent draws within one minute's resolution (possession, event
 * type, player pick, ...) each read their own stream while staying fully reproducible from the
 * `MatchStarted` seed alone.
 */
export const splitRng = (seed: number, key: string): Rng => createSeededRng(hashSeed(seed, key));
