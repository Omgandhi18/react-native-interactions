/**
 * Tuning for Hourglass. Distances are in dp, times in seconds (or ms where the name says so).
 * Shape sizes marked "in bulb heights" scale with the glass: one bulb height runs from the neck to a cap.
 */

export const GLASS = {
  /** The whole hourglass, frame included, is as big as fits within these fractions of the screen. */
  maxHeightFraction: 0.8,
  maxWidthFraction: 0.86,
  /** Centre of the neck as a fraction of screen height. */
  centerY: 0.5,
  /** A bulb's widest half-width, in bulb heights. */
  bulbWidth: 0.46,
  /** Where a bulb is widest, from 0 at the neck to 1 at the cap. */
  widestAt: 0.78,
  /** How much a bulb narrows again between its widest point and the cap, as a fraction of its width. */
  capPinch: 0.18,
  /** Length of the straight neck between the bulbs, each way from its middle, in bulb heights. */
  throat: 0.02,
  /**
   * Width of the neck in sand cells. Each column of the neck passes one grain a step, so this and
   * SAND.stepsPerSecond set how fast the glass runs.
   */
  neckCells: 2,
  /** Points per bulb when drawing the outline. */
  outlineSegments: 96,
} as const;

/** The wooden frame. Sizes in bulb heights. */
export const FRAME = {
  capHeight: 0.07,
  /** How far the caps reach past the posts. */
  capOverhang: 0.035,
  capCornerRadius: 0.02,
  /** Space between a cap and the end of the glass. */
  capGap: 0.003,
  postWidth: 0.04,
  /** Space between a bulb's widest point and a post. */
  postGap: 0.045,
  /** Walnut, shaded like a turned cylinder: dark edge, highlight, body, dark edge. */
  woodColors: ['#22140A', '#6E4A2B', '#4A2F1B', '#1A0F07'],
  woodPositions: [0, 0.3, 0.68, 1],
} as const;

export const SAND = {
  /** With a two-cell neck at 120 steps a second, 240 grains fall each second: a 30-second glass. */
  grains: 7200,
  /** The grains fill this fraction of one bulb, which sets the size of a grain. */
  fillFraction: 0.55,
  /** The simulation runs at a fixed rate, whatever the screen's refresh rate. */
  stepsPerSecond: 120,
  /** How fast a grain falling freely speeds up, in dp/s², and its top speed in dp/s. */
  fallAcceleration: 5000,
  maxFallSpeed: 1300,
  /** A grain is drawn this many cells across, so packed sand looks solid. */
  grainSize: 1.7,
  /** Each grain is drawn up to this fraction of a cell off centre, so the grid doesn't show. */
  jitter: 0.18,
  /**
   * Each step a rolling grain is blocked below and to the side, the chance it keeps rolling over
   * them. Lower stops grains sooner and makes steeper, rougher slopes.
   */
  keepRolling: 0.8,
  /** How many cells a grain rolling off a slope can run across the sand below in one step. */
  rollCells: 4,
  /** Golden sand, darkest to lightest. Each grain gets one at random. */
  tones: ['#B8884F', '#C99A5E', '#D6AA6E', '#E2B97E', '#EDC992'],
  /** Grains falling fast enough to blur are drawn as streaks in this colour. */
  streakColor: '#E8C18A',
  /** Below this much gravity across the screen (phone lying flat), in g, the sand keeps its last direction. */
  minInPlaneGravity: 0.18,
} as const;

/** The strip of sprites every grain is drawn from. */
export const SPRITE = {
  /** A round grain is this many pixels across in the strip, with a solid core and a soft edge. */
  size: 12,
  solidCore: 0.5,
  /** Streaks run from `shortestStreak` grains long, one grain longer each, `streakCount` of them. */
  shortestStreak: 2,
  streakCount: 4,
  /** Streak thickness as a fraction of a grain. */
  streakThickness: 0.8,
  /** A falling grain's streak covers the distance it falls in this many steps. */
  blurSteps: 1.5,
} as const;

export const LOOK = {
  /** The glass is a faint film that thickens toward its edges, like real glass seen side on. */
  glassColor: '#FFFFFF',
  glassAlphas: [0.09, 0.025, 0, 0.025, 0.07],
  glassPositions: [0, 0.18, 0.5, 0.82, 1],
  outlineAlpha: 0.3,
  outlineWidth: 1.2,
  /** A soft reflection down the left of each bulb: how far in it sits, and the stretch of bulb it covers. */
  highlightInset: 0.72,
  highlightFrom: 0.2,
  highlightTo: 0.88,
  /** Its width, in bulb half-widths, and opacity. */
  highlightWidth: 0.05,
  highlightAlpha: 0.14,
  highlightBlur: 3,
  /** A thinner glint on the right. */
  glintInset: 0.86,
  glintFrom: 0.38,
  glintTo: 0.74,
  glintWidth: 0.015,
  glintAlpha: 0.12,
  /** A thin light line along the inside face of each cap. */
  capEdgeColor: '#9A6E48',
  capEdgeAlpha: 0.55,
  capEdgeWidth: 1,
} as const;

export const FLIP = {
  durationMs: 1000,
  /** Mid-flip, the hourglass shrinks to fit within these fractions of the screen as it turns. */
  roomWidthFraction: 0.96,
  roomHeightFraction: 0.96,
} as const;

export const HAPTICS = {
  /** The glass only counts as running out when it stands near upright (gravity along it, in g). */
  uprightGravity: 0.7,
  /** It can run out again once this many grains are back in the upper bulb. */
  rearmGrains: 200,
} as const;

export const TIMING = {
  maxFrameStep: 1 / 30,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const BACKGROUND = {
  /** A warm lamp from above. */
  colors: ['#2A2018', '#110E0B', '#060505'],
  positions: [0, 0.55, 1],
  /** Glow centre as a fraction of height, and its radius as a fraction of height. */
  centerY: 0.38,
  radius: 0.85,
} as const;

export const HINT = {
  text: 'Tap to flip  ·  Or turn your phone over',
  visibleMs: 3200,
  fadeMs: 700,
  bottomOffset: 40,
} as const;
