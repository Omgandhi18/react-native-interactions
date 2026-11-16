/**
 * Tuning for Marble Dust. Distances are in dp, times in seconds (or ms where the name says so),
 * angles in radians. "Statue units" are the scan's own: its height runs from -1 to 1.
 */

export const STATUE = {
  /** The statue is as big as fits within these fractions of the screen height and width. */
  maxHeightFraction: 0.72,
  maxWidthFraction: 0.84,
  /** Centre of the statue as a fraction of screen height. */
  centerY: 0.48,
  /** Camera distance in statue units; smaller exaggerates the depth. */
  cameraDistance: 4,
  /** A slow sway left and right so the depth shows; one full sway takes `swayPeriod` seconds. */
  swayAngle: 0.42,
  swayPeriod: 14,
} as const;

export const GRAIN = {
  /** Diameter of a grain at the statue's own depth. */
  size: 2.8,
  /** Warm marble white. */
  color: { red: 245, green: 237, blue: 222 },
  /** Grains facing away fade out: hidden at `hideFacing`, fully shown at `showFacing` (−1 away, 1 toward you). */
  hideFacing: -0.12,
  showFacing: 0.28,
  /** A grain knocked this far from home shows even if it faces away, so a burst has volume. */
  revealDistance: 36,
  /** Brightness of loose grains in flight. */
  looseBrightness: 0.7,
  /** Grains flying at the camera stop growing past this many times their size. */
  maxPerspective: 4,
  /**
   * Grains are drawn from a strip of pre-shaded dots, darkest to brightest, so no per-grain colour
   * has to cross into native code each frame. Each dot is `spriteSize` pixels with a solid core.
   */
  brightnessLevels: 16,
  spriteSize: 12,
  solidCore: 0.45,
  /** A dim dot is also more see-through: its opacity is its brightness times this, capped at 1. */
  opacityGain: 1.6,
  /** A grain this still (offset plus speed, in dp) is at rest and skips the spring maths. */
  restThreshold: 0.02,
} as const;

export const LIGHT = {
  /** Key light from slightly above and to the left of the viewer (statue axes: x right, y up, z toward you). */
  direction: [-0.3, 0.4, 0.87],
  ambient: 0.06,
  diffuse: 1,
  /** How much the scan's baked crevice darkness (eye sockets, between curls) dims a grain. */
  occlusion: 0.85,
  /** A thin bright edge on the silhouette, like a back light. */
  rim: 0.3,
  /** Brightness is raised to this power when drawn, deepening the mid-tones. Baked into the sprite strip. */
  contrast: 1.4,
} as const;

export const SPRING = {
  /** Pull back home, per second squared. Each grain gets a random multiple so they land at different times. */
  stiffness: 7,
  stiffnessMin: 0.45,
  stiffnessMax: 1.6,
  /** Below 1, grains overshoot home a little before they settle. */
  dampingRatio: 0.78,
} as const;

export const SWIPE = {
  /** Grains within this distance of the finger are knocked loose. */
  radius: 72,
  /** How much of the finger's velocity a grain picks up, per second it spends under the finger. */
  drag: 9,
  /** Outward push from the fingertip, in dp per second squared, so a resting finger parts the dust. */
  push: 2600,
  /** Fraction of the finger's speed sent into depth, toward or away from you. */
  depthDrag: 4,
  /** A finger slower than this (dp/s) doesn't count toward the scatter haptics. */
  minTickSpeed: 250,
} as const;

export const BLAST = {
  /** Launch speed of a grain right at the tap, in dp/s. Each grain gets a random multiple. */
  speed: 1250,
  speedMin: 0.45,
  speedMax: 1.35,
  /** Grains this far from the tap launch at half speed. */
  falloff: 240,
  /** How much of the burst goes into depth, relative to the screen plane. */
  depthShare: 0.9,
  /** A touch that moves further than this is a swipe, not a tap. */
  tapMaxDistance: 10,
} as const;

export const HAPTICS = {
  /** A swipe ticks when at least this many grains are under the finger, at most once per gap. */
  scatterMinGrains: 30,
  scatterTickGapMs: 70,
} as const;

export const TIMING = {
  maxFrameStep: 1 / 30,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const BACKGROUND = {
  /** A dim museum spotlight from above. */
  colors: ['#26221E', '#0E0D0C', '#050505'],
  positions: [0, 0.5, 1],
  /** Glow centre as a fraction of height, and its radius as a fraction of height. */
  centerY: 0.3,
  radius: 0.8,
} as const;

export const HINT = {
  text: 'Swipe to scatter  ·  Tap to shatter',
  visibleMs: 3200,
  fadeMs: 700,
  bottomOffset: 48,
} as const;
