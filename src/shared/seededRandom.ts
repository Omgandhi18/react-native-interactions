export type SeededRandom = {
  next: () => number;
  range: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

/**
 * Mulberry32: a tiny, fast generator that gives the same sequence for the same seed.
 * The odd-looking numbers are the algorithm's published constants.
 */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}
