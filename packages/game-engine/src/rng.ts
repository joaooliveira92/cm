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
