/**
 * The look of the generated city behind the glass and of the fog over it.
 * Distances are in dp. Points and sizes described as "fraction" are relative to the screen
 * width (x) or height (y).
 */

export const SCENE = {
  /** Fixed seed, so the city looks the same on every run and in every recording. */
  seed: 20261114,
  /** The clear city renders at full screen resolution so it's crisp when the fog is wiped away. */
  clearResolution: 1,
  /** The fog is a heavy blur, so a low resolution looks identical and is much cheaper. */
  fogResolution: 0.35,
  /** Just enough softening to stop thin edges shimmering. */
  antiShimmerBlur: 0.5,
  /** Distant things shrink faster than linearly; higher values compress the far end more. */
  perspectiveStep: 0.45,
} as const;

export const SKY = {
  colors: ['#05070F', '#0F1230', '#2A1B45', '#3A1F3A', '#120C16'],
  stops: [0, 0.32, 0.56, 0.7, 1],
  hazeColor: '#FF8C50',
  hazeAlpha: 0.24,
  /** Centre of the orange light-pollution glow, as a fraction of height. */
  hazeCenterY: 0.7,
  /** Glow radius as a fraction of height. */
  hazeRadius: 0.5,
} as const;

export const SKYLINE_LAYERS = [
  {
    baseline: 0.82,
    minHeight: 0.16,
    maxHeight: 0.42,
    minWidth: 22,
    maxWidth: 58,
    maxGap: 4,
    color: '#16162B',
    window: { width: 2.5, height: 3.5, gapX: 4.5, gapY: 6, inset: 4, litChance: 0.3 },
    hasAviationLights: true,
    signChance: 0,
  },
  {
    baseline: 0.95,
    minHeight: 0.2,
    maxHeight: 0.5,
    minWidth: 46,
    maxWidth: 104,
    maxGap: 12,
    color: '#0E0D18',
    window: { width: 4, height: 6, gapX: 7, gapY: 9, inset: 6, litChance: 0.2 },
    hasAviationLights: false,
    signChance: 0.45,
  },
] as const;

export const WINDOWS = {
  colors: ['#FFCE82', '#FFAA5A', '#AAD7FF'],
  alpha: 0.85,
  /** Share of lit windows that also glow through the fog. Too many and the fog washes out. */
  glowChance: 0.05,
  glowIntensity: 0.25,
  /** Window glows stay small; the big blooms are for lamps, cars and signs. */
  glowRadius: 2,
} as const;

/** Red warning lights on top of tall towers. */
export const AVIATION_LIGHT = {
  /** Only towers taller than this fraction of the screen height get one. */
  minBuildingHeight: 0.3,
  color: '#FF3B30',
  radius: 1.3,
  haloRadius: 7,
  haloAlpha: 0.55,
  intensity: 0.8,
} as const;

export const NEON_SIGNS = {
  colors: ['#FF3DA8', '#33E1FF', '#FF8A2B', '#B26BFF', '#4DFF9A'],
  minWidth: 16,
  maxWidth: 44,
  /** A sign is never wider than this fraction of its building. */
  maxBuildingShare: 0.75,
  minHeight: 6,
  maxHeight: 11,
  cornerRadius: 2,
  topMargin: 14,
  bottomMargin: 40,
  glowBlur: 5,
  glowAlpha: 0.75,
  bodyAlpha: 0.95,
  intensity: 1,
} as const;

/** The road recedes to a vanishing point between the buildings. */
export const ROAD = {
  vanishingPoint: { x: 0.62, y: 0.775 },
  /** Half the road's width where it meets the horizon, as a fraction of screen width. */
  horizonHalfWidth: 0.025,
  bottomLeftX: -0.15,
  bottomRightX: 1.2,
  color: '#0A0910',
  /** Wet asphalt picks up the city's orange glow. */
  sheenColor: '#FFA05A',
  sheenAlpha: 0.16,
} as const;

/** Street lamps along both sides of the road. `from` is the nearest lamp's base, `to` the farthest. */
export const LAMP_ROWS = [
  { from: { x: 0.02, y: 0.985 }, to: { x: 0.585, y: 0.785 }, count: 10, color: '#FFB25E' },
  { from: { x: 1, y: 0.985 }, to: { x: 0.66, y: 0.785 }, count: 8, color: '#FFD9A0' },
] as const;

export const LAMP = {
  nearHeadRadius: 3.6,
  farHeadRadius: 0.9,
  nearPoleHeight: 70,
  farPoleHeight: 10,
  nearPoleWidth: 2,
  farPoleWidth: 0.6,
  poleColor: '#06060B',
  /** Halo radius as a multiple of the lamp head. */
  haloScale: 7,
  haloAlpha: 0.35,
  intensity: 1,
} as const;

/** Oncoming headlights in one lane, taillights moving away in the other. */
export const CAR_LANES = [
  { from: { x: 0.3, y: 1 }, to: { x: 0.605, y: 0.78 }, count: 4, color: '#FFF1D6' },
  { from: { x: 0.82, y: 1 }, to: { x: 0.635, y: 0.78 }, count: 4, color: '#FF2E3F' },
] as const;

export const CAR_LIGHTS = {
  nearRadius: 4,
  farRadius: 0.7,
  /** Gap between a car's two lights, near and far. */
  nearSpacing: 30,
  farSpacing: 3.5,
  /** Cars are placed between these depths (1 = nearest). */
  minDepth: 0.05,
  maxDepth: 1,
  haloScale: 6,
  haloAlpha: 0.4,
  intensity: 1,
} as const;

/** Lights smear into long streaks on the wet road below them. */
export const REFLECTIONS = {
  nearLength: 110,
  farLength: 10,
  /** Streak width as a multiple of the light's radius. */
  widthScale: 1.8,
  alpha: 0.4,
} as const;

export const FOG_LOOK = {
  blur: 16,
  /** Lifts the blacks and washes out colour, like light scattering through condensation. Offsets are 0–1. */
  colorMatrix: [
    0.62, 0.07, 0.07, 0, 0.14,
    0.07, 0.62, 0.07, 0, 0.15,
    0.07, 0.07, 0.66, 0, 0.18,
    0, 0, 0, 1, 0,
  ],
  /** Each light blooms into a soft disc in the fog, much bigger than the light itself. */
  bloomScale: 6,
  bloomMinRadius: 8,
  bloomMaxRadius: 46,
  bloomAlpha: 0.45,
  /** Bloom edge blur as a fraction of the bloom radius. */
  bloomSoftness: 0.4,
  veilColor: '#AAB6CD',
  veilAlpha: 0.12,
  /** Tiny specks of condensation catching the light. */
  grainCount: 3000,
  grainColor: '#FFFFFF',
  grainMinRadius: 0.3,
  grainMaxRadius: 0.9,
  grainMinAlpha: 0.04,
  grainMaxAlpha: 0.12,
} as const;
