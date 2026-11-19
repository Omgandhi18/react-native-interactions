// Tuning for Fireflies. Positions are fractions of the screen unless they say dp; time is in seconds.

/** Seeds the swarm, the stars and the grass, so every launch looks the same. */
export const SEED = 2207;

export const SWARM = {
  fireflies: 300,
  /** Where they roam once awake: fractions of screen width and height. */
  left: 0.06,
  right: 0.94,
  top: 0.22,
  bottom: 0.82,
  /** Nearer fireflies are drawn bigger. */
  nearScale: 1.25,
  farScale: 0.55,
} as const;

/** Each firefly loops lazily around its own spot in the meadow. */
export const FLIGHT = {
  maxSpeed: 45,
  /** How quickly a firefly turns toward where it wants to be, per second. */
  steering: 1.2,
  /** Speed toward its target per dp still to go, per second, so it slows as it arrives. */
  arrive: 1.5,
  /** How far each one loops from its spot, in dp, and how fast, in radians per second. */
  minWander: 18,
  maxWander: 45,
  minWanderSpeed: 0.25,
  maxWanderSpeed: 0.7,
  /** Asleep in the jar they barely move. */
  sleepWander: 3,
  /** At full strength the wind carries them this far sideways, in dp. */
  windDrift: 16,
} as const;

/** Leaving the jar: they don't all go at once. */
export const RELEASE = {
  /** The last one leaves this long after the tap. */
  spread: 3,
  /** They rise this far above the jar's mouth, in dp, before heading out to their spot. */
  rise: 40,
} as const;

/**
 * The Kuramoto model: every firefly is a clock running at its own speed, nudged each moment
 * toward the swarm's average rhythm. Above a critical coupling the nudges win and they all
 * end up flashing together.
 */
export const BLINK = {
  /** Average flashes per second, and how much each firefly's own rate differs from it (one standard deviation). */
  meanHz: 0.55,
  spreadHz: 0.04,
  /** How hard each firefly is pulled toward the swarm's rhythm, in radians per second. */
  coupling: 1.2,
  /** The flash, as shares of one cycle: a quick rise, then a fade. */
  rise: 0.04,
  fade: 0.22,
  /** How bright a sleeping firefly glows, from 0 to 1. */
  sleepGlow: 0.12,
} as const;

/** Once they're in step, you feel each shared flash. */
export const PULSE = {
  /** How in step they must be (the Kuramoto order parameter, 0 to 1). */
  minOrder: 0.85,
} as const;

/** Tapping once they're awake startles them: their rhythms scatter and fireflies near the tap dart away. */
export const STARTLE = {
  radius: 110,
  kick: 120,
} as const;

/**
 * One glow sprite per brightness level, in one strip: a tiny white-hot core, a yellow-green
 * halo and a faint bloom, the way a firefly looks to the eye (or a camera) at night.
 */
export const GLOW = {
  levels: 12,
  /** Sprite size in pixels, and its radius on screen at full size, in dp. Big enough to keep the core crisp. */
  size: 128,
  radiusDp: 22,
  colors: ['#FFFFF0', '#E9FF8C', '#C9F24A', '#A6DA2E', '#A6DA2E'],
  alphas: [1, 1, 0.55, 0.12, 0],
  positions: [0, 0.05, 0.12, 0.35, 1],
  /** A dim glow is drawn at this share of full size, growing to full size at full brightness. */
  minSwell: 0.6,
} as const;

/** The meadow lights up a little with each flash. */
export const AMBIENT = {
  color: '#B8F25A',
  /** Brightest it gets, when every firefly flashes at once. Kept low and on the meadow, so the sky stays dark. */
  alpha: 0.06,
  /** Centre and radius, as fractions of screen height. */
  centerY: 0.75,
  radius: 0.5,
} as const;

/** Sleeping fireflies light the jar from inside, and the light fades as they leave. */
export const JAR_GLOW = {
  color: '#C6F04A',
  alpha: 0.28,
  /** Radius as a share of the jar's width. */
  radius: 0.9,
} as const;

/** Fractions of screen height, top to bottom. */
export const SKY = {
  colors: ['#020309', '#050A18', '#0B162B', '#16263A'],
  positions: [0, 0.3, 0.5, 0.6],
} as const;

/** The last of the dusk, low over the trees. */
export const HORIZON_GLOW = {
  color: '#2B4458',
  alpha: 0.4,
  centerY: 0.64,
  radius: 0.45,
} as const;

/**
 * A faint band of the Milky Way across the sky: fractal noise, tinted and faded out to either
 * side of a line through the sky.
 */
export const MILKY_WAY = {
  color: '#B9C8E8',
  /** Strongest alpha in the band, and how much of the noise shows (noise below `threshold` is clear sky). */
  alpha: 0.16,
  threshold: 0.42,
  /** Noise features about this many dp across, built from this many layers of detail. */
  featureDp: 70,
  octaves: 4,
  /** The band runs through this point (fractions of width and height) at this angle, in degrees. */
  centerX: 0.55,
  centerY: 0.22,
  angle: -32,
  /** Half its width, as a fraction of screen height. */
  halfWidth: 0.12,
} as const;

export const STARS = {
  count: 420,
  /** Bright ones are drawn bigger, with a halo. */
  bright: 14,
  /** Most sit above this line; the horizon haze hides the rest. */
  bottom: 0.58,
  /** Core radius in dp: most stars, then the bright ones. */
  minRadius: 0.3,
  maxRadius: 0.75,
  brightRadius: 1.2,
  minAlpha: 0.12,
  maxAlpha: 0.7,
  /** Blue-white, white and warm, picked at random. */
  colors: ['#CFE0FF', '#FFFFFF', '#FFE9C7'],
  /** Share of stars pulled toward the Milky Way. */
  inBand: 0.45,
} as const;

/**
 * Twinkling: each star's light is dimmed by two slow flickers multiplied together, so it never
 * repeats neatly. Stars low in the sky twinkle more, because their light crosses more air.
 */
export const TWINKLE = {
  /** How much of a star's light the flicker can take away, overhead and at the horizon. */
  overhead: 0.25,
  horizon: 0.8,
  /** Flicker speeds, in radians per second. */
  minSpeed: 1.2,
  maxSpeed: 4.5,
} as const;

/** One star sprite per colour per brightness level: a core and a soft halo. */
export const STAR_SPRITE = {
  levels: 8,
  size: 16,
  /** The core's share of the sprite's radius; the rest is halo. */
  core: 0.3,
  alphas: [1, 0.85, 0.2, 0],
  positions: [0, 0.3, 0.55, 1],
} as const;

/** Now and then a shooting star streaks across the upper sky, behind the trees. */
export const METEOR = {
  /** Seconds between them. */
  minGap: 6,
  maxGap: 14,
  duration: 0.7,
  /** How far the head travels, and the tail's length, in dp. */
  minTravel: 90,
  maxTravel: 170,
  tail: 70,
  /** Its width at the head; the tail thins by this share, drawn in this many fading pieces. */
  width: 1.6,
  taper: 0.8,
  segments: 10,
  color: '#E8F0FF',
  /** Where it starts, as fractions of screen height, and its angle below level, in degrees. */
  top: 0.05,
  bottom: 0.32,
  minAngle: 18,
  maxAngle: 40,
} as const;

/**
 * A forest edge: a row of trees, some broadleaf, some conifer, with a ragged, leafy outline.
 * Heights are fractions of screen height; each tree's width follows from its height.
 */
export type ForestShape = {
  color: string;
  baseline: number;
  minHeight: number;
  maxHeight: number;
  /** Share of trees that are conifers. */
  conifers: number;
  /** How far the leafy edge jitters, in dp. */
  ragged: number;
  /** Trees toward the sides grow up to this many times taller, framing the clearing. */
  edgeGrowth: number;
  /** Softening from distance, in dp. */
  blur: number;
  /** Radius of a broadleaf's leaf clusters, in dp: smaller further away. */
  minLeafCluster: number;
  maxLeafCluster: number;
};

/** How each tree's outline is built. */
export const TREE = {
  /** A conifer: a narrow spire of stacked branch tiers. Its half-width at the base as a share of its height. */
  minSpireWidth: 0.18,
  maxSpireWidth: 0.28,
  /** Tiers this many dp apart, each a little triangle this many tier-spacings tall, its width jittered by up to this share. */
  tierDp: 6,
  tierRise: 1.8,
  tierJitter: 0.15,
  /** A broadleaf: a crown of round leaf clusters packed into a dome, its half-width as a share of its height. */
  minCrownWidth: 0.5,
  maxCrownWidth: 0.85,
  /** How much of the tree's height the crown fills, and how thickly clusters pack it (1 would just cover it). */
  crownDepth: 0.65,
  clusterCover: 1.6,
  /** The next tree starts this many half-widths along, so neighbours overlap. */
  minSpacing: 0.7,
  maxSpacing: 1.4,
  /** The outline is sampled every this many dp. */
  step: 1,
} as const;

export const FAR_FOREST: ForestShape = {
  color: '#0A1424',
  baseline: 0.62,
  minHeight: 0.025,
  maxHeight: 0.045,
  conifers: 0.4,
  ragged: 1.2,
  edgeGrowth: 0.2,
  blur: 0.8,
  minLeafCluster: 1.5,
  maxLeafCluster: 3.5,
};

export const NEAR_FOREST: ForestShape = {
  color: '#03060B',
  baseline: 0.645,
  minHeight: 0.045,
  maxHeight: 0.08,
  conifers: 0.35,
  ragged: 1.5,
  edgeGrowth: 0.6,
  blur: 0,
  minLeafCluster: 3,
  maxLeafCluster: 7,
};

/** Low mist, stretched sideways, lying along the foot of the forest. */
export const MIST = {
  color: '#7D93A6',
  alpha: 0.16,
  threshold: 0.38,
  /** Noise features this many dp across and tall. */
  featureWidth: 120,
  featureHeight: 18,
  octaves: 3,
  /** Its band, as fractions of screen height: fading in, strongest, fading out. */
  top: 0.56,
  middle: 0.625,
  bottom: 0.7,
  /** A fainter copy drifts sideways over the meadow's far edge: its share of the alpha, and speed in dp per second. */
  driftShare: 0.5,
  driftSpeed: 6,
} as const;

/** The meadow floor, and thousands of grass strokes that grow taller toward you. */
export const FIELD = {
  top: 0.63,
  colors: ['#0A1316', '#020405'],
  blades: 2600,
  /** Blade heights at the far edge and at the bottom of the screen, in dp. */
  farHeight: 1.5,
  nearHeight: 26,
  farWidth: 0.5,
  nearWidth: 1.6,
  farColor: '#132226',
  nearColor: '#040809',
  /** Blades are drawn in this many bands of depth, one path each. */
  bands: 10,
  /** Bunches more blades toward the far edge, the way perspective does. */
  crowding: 1.6,
  lean: 0.35,
  /** Blades nearer than this share of the way down sway in the wind; the far ones are too small to see move. */
  swayFrom: 0.35,
} as const;

/** One tapered blade per depth band, upright with its root at the bottom: pixels. */
export const FIELD_SPRITE = {
  width: 12,
  height: 64,
  bladeHeight: 60,
  rootWidth: 3.5,
  /** How far the tip curves to one side, as a share of the blade's height. */
  curve: 0.12,
} as const;

/** Tall grass and seed heads right in front of the camera, softly out of focus. */
export const FOREGROUND = {
  blades: 140,
  seedHeads: 14,
  color: '#010203',
  /** Where blades grow from, and how tall they get, as fractions of screen height. */
  minRoot: 0.9,
  minHeight: 0.06,
  maxHeight: 0.2,
  /** How far each one leans at rest either way, in degrees. */
  lean: 14,
} as const;

/**
 * The foreground grass's sprites: a few blade shapes and seed-head stems, already blurred (out
 * of focus), each upright with its root at the bottom centre of its cell. Pixels.
 */
export const FOREGROUND_SPRITE = {
  blades: 8,
  seedHeads: 4,
  width: 48,
  height: 256,
  /** Room left round each shape so its blur doesn't bleed into the next cell. */
  margin: 10,
  rootWidth: 6,
  /** How far a blade's tip curves to one side, at most, as a share of its height. */
  curve: 0.25,
  stemWidth: 1.6,
  seedLength: 18,
  seedWidth: 5,
  blur: 2.5,
} as const;

/**
 * The wind that moves the grass and the fireflies: waves roll across the screen, and gusts come
 * and go. Its strength at a point is from -1 to 1; positive leans things to the right.
 */
export const WIND = {
  /** A steady lean plus a ripple, as shares of the full lean. */
  steady: 0.4,
  ripple: 0.6,
  /** The main wave's length and speed across the screen, in dp and dp per second. */
  wavelength: 260,
  waveSpeed: 110,
  /** A smaller, faster wave on top: its length and speed as multiples of the main one's, its share, and its offset in radians. */
  detailScale: 2.3,
  detailSpeed: 1.7,
  detailShare: 0.3,
  detailOffset: 1.3,
  /** Between gusts the wind drops to this share. Gusts rise and fall on two slow cycles, in radians per second. */
  calm: 0.35,
  gustSpeedA: 0.21,
  gustSpeedB: 0.53,
  gustOffset: 1.1,
} as const;

/** How far the wind turns grass about its root, at full strength, in degrees, plus each blade's own flutter. */
export const SWAY = {
  field: 10,
  foreground: 6,
  flutter: 1.5,
  minFlutterSpeed: 1.5,
  maxFlutterSpeed: 3,
} as const;

/** Darker toward the corners, like a lens. */
export const VIGNETTE = {
  /** Clear inside this share of the radius. */
  clear: 0.55,
  alpha: 0.55,
  /** Radius as a fraction of screen height. */
  radius: 0.85,
} as const;

/** An open glass jar standing in the grass. Fractions of screen width and height. */
export const JAR = {
  centerX: 0.5,
  bottom: 0.93,
  width: 0.32,
  height: 0.22,
  /** The neck's width as a share of the body's, and how much of the height the neck takes. */
  neck: 0.72,
  neckHeight: 0.13,
  /** How much of the height the shoulders take, curving out from the neck. */
  shoulder: 0.12,
  cornerRadius: 0.12,
  /** Sleeping fireflies stay this far inside the glass, in dp. */
  inset: 12,
  glassColor: '#BFD8E6',
  glassAlpha: 0.035,
  /** The outer edge, and a softer line just inside it: the thickness of the glass. */
  edgeAlpha: 0.2,
  edgeWidth: 1.2,
  innerEdgeAlpha: 0.07,
  innerEdgeWidth: 3,
  innerEdgeInset: 2.5,
  /** The rim's ellipse depth as a share of the neck's half-width, and its outer and inner lines. */
  rimDepth: 0.2,
  rimAlpha: 0.38,
  innerRimAlpha: 0.18,
  rimThickness: 2.5,
  /** Screw threads around the neck. */
  threads: 3,
  threadAlpha: 0.16,
  /** Soft vertical highlights, left (strong) and right (faint): position and width as shares of the half-width. */
  highlights: [
    { at: -0.72, width: 0.12, alpha: 0.26 },
    { at: 0.8, width: 0.06, alpha: 0.12 },
  ],
  highlightBlur: 1.2,
  /** The thick glass base, this many dp tall. */
  baseThickness: 7,
  baseAlpha: 0.14,
  /** A soft dark shadow where it stands: how far it spreads past the jar's sides, and how deep it is, as shares of the half-width. */
  shadowColor: '#000000',
  shadowAlpha: 0.6,
  shadowBlur: 6,
  shadowSpread: 1.1,
  shadowDepth: 0.18,
} as const;

export const TIMING = {
  maxFrameStep: 1 / 30,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const HINT = {
  text: 'Tap the jar to wake them',
  visibleMs: 3200,
  fadeMs: 700,
  bottomOffset: 40,
} as const;
