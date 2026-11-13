/**
 * Tuning for the Monsoon window's simulation and rendering. The look of the city and the fog
 * lives in scene/constants.ts.
 * Distances are in dp, times in seconds, speeds in dp per second.
 * Values described as "fraction" are relative to the screen width or height.
 */

export const TIMING = {
  /** Longest simulation step, so a dropped frame can't teleport drops across the screen. */
  maxFrameStep: 1 / 20,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const FOG = {
  /** Fully opaque: the city behind is sharp, so any see-through would show a ghostly grid of windows. */
  opacity: 1,
} as const;

export const WIPE = {
  /** Finger radius. */
  radius: 24,
  /** Gap between wipe marks along a stroke, as a fraction of the radius. */
  spacing: 0.4,
  /** Blur on the edge of the cleared area. */
  edgeSoftness: 6,
  /** How long a wiped area stays fully clear before the fog starts coming back. */
  holdTime: 2.5,
  /** How long the fog takes to fully return. */
  returnTime: 6,
  maxMarks: 700,
  /** Distance between the light "squeak" haptics while wiping. */
  hapticSpacing: 80,
} as const;

export const DROPLETS = {
  initialCount: 70,
  max: 140,
  spawnPerSecond: 6,
  minRadius: 0.8,
  maxRadius: 4.5,
  /** Higher values make small droplets more common. */
  sizeBias: 2.5,
  /** New droplets swell in over this time. */
  growTime: 0.2,
  /** Below this radius a droplet is just a glint, with no refraction. */
  tinyRadius: 1.6,
  /** A drop works like a lens: it shows an upside-down view of this many times its own size. */
  refractionZoom: 4.5,
} as const;

export const RUNNERS = {
  max: 6,
  /** A droplet this big gets heavy enough to start running down the glass. */
  startRadius: 5.5,
  /** Chance that a raindrop lands big enough to run straight away. */
  heavySpawnChance: 0.05,
  heavyMaxRadius: 8,
  /** A runner that has left this much of itself behind stops. */
  stopRadius: 3,
  maxRadius: 13,
  baseSpeed: 60,
  acceleration: 3,
  /** Real drops run in stops and starts. */
  stickChancePerSecond: 1.2,
  minStickTime: 0.05,
  maxStickTime: 0.6,
  minStartDelay: 0.2,
  maxStartDelay: 1.5,
  /** How far a runner's path wanders from straight down, in radians. */
  meander: 0.18,
  meanderSpeed: 1.4,
  /** Distance between the tiny droplets a runner leaves behind. */
  trailSpacing: 8,
  trailMinRadius: 0.5,
  trailMaxRadius: 1.4,
  /** How far behind the runner its trail droplets land, as a fraction of its radius. */
  trailBackOffset: 1.3,
  trailJitter: 0.4,
  /** Width of the clear streak a runner cuts through the fog, as a fraction of its radius. */
  trailClearRadius: 0.8,
  /** Runners swallow droplets that come within this fraction of their combined radii. */
  absorbReach: 0.85,
  absorbBoost: 8,
  /** Runners stretch along their direction of travel. */
  stretch: 1.22,
  squash: 0.9,
} as const;

export const DROP_LOOK = {
  spriteSize: 128,
  rimColors: ['rgba(5, 8, 15, 0)', 'rgba(5, 8, 15, 0)', 'rgba(5, 8, 15, 0.28)', 'rgba(5, 8, 15, 0.55)'],
  rimStops: [0, 0.6, 0.86, 1],
  /** Light gathers at the bottom of a drop. Offsets and radii are fractions of the drop radius. */
  causticColors: ['rgba(255, 255, 255, 0.28)', 'rgba(255, 255, 255, 0)'],
  causticOffsetY: 0.45,
  causticRadius: 0.45,
  highlightColor: '#FFFFFF',
  highlightAlpha: 0.85,
  highlightBlur: 0.04,
  highlightRotation: -30,
  highlightX: -0.56,
  highlightY: -0.55,
  highlightWidth: 0.4,
  highlightHeight: 0.24,
  glintAlpha: 0.4,
  glintX: 0.34,
  glintY: 0.4,
  glintRadius: 0.07,
  shadowColors: ['rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0)'],
  shadowScale: 1.25,
  shadowOffsetX: 0.1,
  shadowOffsetY: 0.22,
} as const;

export const RAIN = {
  /** Rain falling outside, seen through wiped areas. */
  streakCount: 140,
  minSpeed: 900,
  maxSpeed: 1500,
  minLength: 14,
  maxLength: 30,
  /** Wind pushes the rain slightly off vertical, in radians. */
  slant: 0.1,
  minAlpha: 0.06,
  maxAlpha: 0.2,
  strokeWidth: 1,
  color: '#CFE0FF',
} as const;

export const LIGHTNING = {
  firstMinDelay: 6,
  firstMaxDelay: 10,
  minInterval: 14,
  maxInterval: 28,
  duration: 1,
  /** Lightning usually flickers: a second, weaker flash follows the first. */
  secondFlashAt: 0.18,
  secondStrength: 0.75,
  firstDecay: 14,
  secondDecay: 10,
  maxAlpha: 0.55,
  color: '#DDE6FF',
} as const;

export const GRAVITY = {
  standard: 9.81,
  /** How quickly drops respond to tilting the phone. */
  smoothing: 5,
  /** Below this much in-plane gravity (phone lying flat), runners stop. Fraction of 1 g. */
  minInPlane: 0.18,
} as const;
