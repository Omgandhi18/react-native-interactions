/**
 * Tuning for the holographic card's layout, motion and lighting.
 * Distances are in dp, angles in radians, times in milliseconds.
 * Each card design's own look lives with the design in designs/.
 */

export const CARD = {
  /** ID-1 card proportions (85.6 × 54 mm), stood upright. */
  aspectRatio: 85.6 / 53.98,
  /** The card is as big as fits within these fractions of the screen width and height. */
  maxWidthFraction: 0.74,
  maxHeightFraction: 0.62,
  /** Card centre as a fraction of screen height; just above the middle leaves room for its shadow. */
  centerY: 0.46,
  cornerRadiusFraction: 0.06,
  edgeColor: 'rgba(255, 255, 255, 0.14)',
  edgeWidth: 1,
} as const;

export const MOTION = {
  /** Camera distance for the 3D tilt; smaller is more dramatic. */
  perspective: 900,
  maxRotateX: 0.32,
  maxRotateY: 0.42,
  /** Tilt per g of change in the phone's angle. */
  sensorSensitivity: 2.2,
  standardGravity: 9.81,
  /** How quickly the resting angle catches up with however you're holding the phone. */
  recenterPerSecond: 0.35,
  /** Dragging this fraction of the screen tilts the card all the way. */
  dragRangeX: 0.45,
  dragRangeY: 0.35,
  /** A slow sway when there's no tilt sensor (simulators), so the foil still moves. */
  idleSwayX: 0.35,
  idleSwayY: 0.2,
  idleSpeedX: 0.55,
  idleSpeedY: 0.4,
  springBack: { damping: 14, stiffness: 120 },
  flip: { damping: 16, stiffness: 110 },
  /** A swipe faster than this (dp per second) and longer than `flickMinDistance` spins the card a half-turn. */
  flickMinVelocity: 900,
  flickMinDistance: 30,
  /** Floor for a swipe's duration when working out its average speed (one frame). */
  minGestureSeconds: 1 / 60,
  /** A touch that moves further than this isn't a tap, so drags never flip the card. */
  tapMaxDistance: 8,
  maxFrameStep: 1 / 20,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const LIGHT = {
  /** How far the bright foil band shifts per unit of tilt, along x and y. Shared by the shader and the haptics. */
  bandShift: [0.55, 0.45],
  /** Minimum time between "glint" haptic ticks. */
  glintTickMinGapMs: 140,
} as const;

export const SHADOW = {
  color: 'rgba(0, 0, 0, 0.6)',
  blur: 26,
  /** How far below the card the shadow sits, and how far it slides as the card tilts. */
  offsetY: 18,
  shift: 22,
  /** The shadow is a little narrower than the card, like a soft contact shadow. */
  inset: 10,
} as const;

export const BACKGROUND = {
  colors: ['#1C1830', '#0B0A12', '#050508'],
  positions: [0, 0.55, 1],
  /** Glow centre as a fraction of height, and its radius as a fraction of height. */
  centerY: 0.42,
  radius: 0.75,
} as const;

export const HINT = {
  text: 'Tilt  ·  Drag  ·  Flick or tap to flip',
  visibleMs: 3200,
  fadeMs: 700,
  bottomOffset: 48,
} as const;
