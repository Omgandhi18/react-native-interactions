// Small helpers shared by the simulation and the renderer. All run on the UI thread.

/** Deterministic pseudo-random number in [0, 1) for a given input (the classic GLSL sine hash). */
export function hash01(n: number): number {
  'worklet';
  const value = Math.sin(n * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function randomRange(min: number, max: number): number {
  'worklet';
  return min + (max - min) * Math.random();
}

export function lerp(from: number, to: number, t: number): number {
  'worklet';
  return from + (to - from) * t;
}

export function smoothstep01(t: number): number {
  'worklet';
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Radius of the drop you get by merging two drops, keeping their total volume. */
export function mergeRadius(a: number, b: number): number {
  'worklet';
  return Math.cbrt(a ** 3 + b ** 3);
}

/** Radius left after a drop gives away a droplet of radius `removed`. */
export function shrinkRadius(radius: number, removed: number): number {
  'worklet';
  return Math.cbrt(Math.max(0, radius ** 3 - removed ** 3));
}
