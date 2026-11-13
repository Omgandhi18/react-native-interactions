/**
 * Every tuning value for the Monsoon window lives here.
 * Distances are in dp, times in seconds, speeds in dp per second.
 * Values described as "fraction" are relative to the screen width or height.
 */

export const TIMING = {
  /** Longest simulation step, so a dropped frame can't teleport drops across the screen. */
  maxFrameStep: 1 / 20,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const SCENE = {
  /** Fixed seed, so the city looks the same on every run and in every recording. */
  seed: 20261114,
  /** Fraction of screen pixels to render the city at. It's blurred anyway, so this saves time and memory. */
  resolution: 0.5,
  /** The city is out of focus behind the glass. Too little and rooftops look like hard-edged glitches. */
  depthOfFieldBlur: 4,
} as const;

export const SKY = {
  colors: ['#05070F', '#0F1230', '#2A1B45', '#3A1F3A', '#120C16'],
  stops: [0, 0.32, 0.56, 0.7, 1],
  hazeColors: ['rgba(255, 140, 80, 0.24)', 'rgba(255, 140, 80, 0)'],
  /** Centre of the orange light-pollution glow, as a fraction of height. */
  hazeCenterY: 0.68,
  /** Glow radius as a fraction of height. */
  hazeRadius: 0.55,
} as const;

export const SKYLINE_LAYERS = [
  {
    baseline: 0.8,
    minHeight: 0.14,
    maxHeight: 0.34,
    minWidth: 24,
    maxWidth: 62,
    maxGap: 6,
    color: '#15152A',
    window: { width: 2.5, height: 3.5, gapX: 4.5, gapY: 6, inset: 4, litChance: 0.3 },
  },
  {
    baseline: 0.93,
    minHeight: 0.2,
    maxHeight: 0.48,
    minWidth: 46,
    maxWidth: 108,
    maxGap: 14,
    color: '#0E0D18',
    window: { width: 4, height: 6, gapX: 7, gapY: 9, inset: 6, litChance: 0.2 },
  },
] as const;

export const WINDOW_COLORS = [
  'rgba(255, 206, 130, 0.85)',
  'rgba(255, 170, 90, 0.75)',
  'rgba(170, 215, 255, 0.6)',
] as const;

export const STREET = {
  /** Top of the street, as a fraction of height. */
  top: 0.9,
  color: '#0B0910',
} as const;

export const BOKEH = {
  count: 80,
  /** Vertical band the lights fall in, as fractions of height. */
  minY: 0.3,
  maxY: 1.02,
  minRadius: 5,
  maxRadius: 30,
  /** Higher values make small lights more common than big ones. */
  sizeBias: 2,
  minAlpha: 0.25,
  maxAlpha: 0.75,
  /** Edge blur as a fraction of each light's radius. */
  softness: 0.18,
  colors: ['#FFB35C', '#FF7A3D', '#FF3D4A', '#4FD6FF', '#FF4FC3', '#FFF1D6'],
} as const;

/** Rows of lights receding into the distance, so the street has depth. Points are fractions of the screen. */
export const LIGHT_ROWS = [
  { from: { x: 0.04, y: 0.98 }, to: { x: 0.6, y: 0.75 }, count: 11, nearRadius: 26, farRadius: 5, color: '#FFB25E', alpha: 0.7 },
  { from: { x: 1.02, y: 0.96 }, to: { x: 0.7, y: 0.76 }, count: 9, nearRadius: 22, farRadius: 5, color: '#FFD9A0', alpha: 0.6 },
  { from: { x: 0.42, y: 0.99 }, to: { x: 0.64, y: 0.78 }, count: 7, nearRadius: 9, farRadius: 3, color: '#FF2E3F', alpha: 0.75 },
] as const;

export const FOG = {
  blur: 14,
  /** How much the fog hides the city. Just below 1, so rain and lights glow through faintly. */
  opacity: 0.95,
  /** Lifts the blacks and washes out colour, like light scattering through condensation. Offsets are 0–1. */
  colorMatrix: [
    0.62, 0.07, 0.07, 0, 0.16,
    0.07, 0.62, 0.07, 0, 0.17,
    0.07, 0.07, 0.66, 0, 0.2,
    0, 0, 0, 1, 0,
  ],
  veilColor: 'rgba(170, 182, 205, 0.12)',
  /** Tiny specks of condensation catching the light. */
  grainCount: 3000,
  grainColor: '#FFFFFF',
  grainMinRadius: 0.3,
  grainMaxRadius: 0.9,
  grainMinAlpha: 0.04,
  grainMaxAlpha: 0.12,
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
