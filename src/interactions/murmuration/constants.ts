// Tuning for Murmuration. World units are dp at the camera's focus distance; time is in seconds.

/** Seeds the starting flock and the treeline, so every launch looks the same. */
export const SEED = 1803;

export const FLOCK = {
  birds: 3000,
  /** Each starling watches its seven nearest neighbours, however near or far (Ballerini et al., PNAS 2008). */
  neighbours: 7,
  /** Side of one spatial-hash cell. About the spacing between birds, so the 8 cells nearest a bird hold its nearest seven. */
  cellSize: 20,
  /** Hash table size. A power of two, at least twice the bird count, so few cells share a bucket. */
  hashBuckets: 8192,
  /** Neighbours are looked up for a sixth of the flock each frame, so each list is at most six frames old. */
  searchGroups: 6,
  /** Half the flock steers each frame, so each bird turns 30 times a second. Every bird still moves every frame. */
  steerGroups: 2,
  /** A bird with fewer than seven neighbours in the cells around it looks this many cells out. */
  maxSearchRing: 2,
  /** The starting flock fills this share of the roost along x, y and z: a flat stream rather than a ball. */
  startSpread: [0.9, 0.35, 0.5],
  /** Starting headings spread this far either side of the flock's, in radians. */
  startScatter: 0.5,
  /** Starting climb or dive, at most, as a share of cruising speed. */
  startClimb: 0.2,
} as const;

/**
 * Large primes for hashing a cell's three coordinates into one bucket, from Teschner et al.,
 * "Optimized Spatial Hashing for Collision Detection of Deformable Objects" (2003).
 */
export const HASH_PRIMES = [73856093, 19349663, 83492791] as const;

export const FLIGHT = {
  cruiseSpeed: 110,
  minSpeed: 70,
  maxSpeed: 170,
  /** How quickly a bird gets back to cruising speed, per second. */
  speedHold: 1.5,
  /** Matching the neighbours' velocity, per second. */
  alignment: 6,
  /** Pull toward the neighbours' centre, per second squared. */
  cohesion: 1,
  /** Neighbours closer than this push apart, hardest when touching. */
  separationDistance: 22,
  separation: 260,
  /** Damping on climbing and diving, per second. */
  levelling: 3,
  /** Random steering, so the flock never locks into a crystal. */
  wander: 20,
} as const;

/** The flock circles a roost point that drifts slowly around the sky, and is pulled back when it strays. */
export const ROOST = {
  /** How far birds can stray before the pull starts: fractions of screen width and height, and dp in depth. */
  radiusX: 0.45,
  radiusY: 0.16,
  radiusZ: 120,
  /** How high the roost flies above eye level, as a fraction of screen height. */
  height: 0.32,
  /** The roost sits this much nearer than the focus distance, so the flock spends more time close and large. */
  nearer: 60,
  /**
   * Pull toward the roost point per second squared per dp away, always on. Strongest in height,
   * which keeps the flock a flat sheet, and weakest in depth, so it swings toward and away from
   * you more than off the sides of the screen.
   */
  spring: { x: 0.8, y: 2.5, z: 0.5 },
  /** Extra pull per second squared for each roost radius strayed past the edge. */
  pull: 2,
  /** How far the roost point drifts each way (as above), and how fast, in radians per second. */
  roamX: 0.12,
  roamY: 0.06,
  roamZ: 60,
  roamSpeedX: 0.13,
  roamSpeedY: 0.21,
  roamSpeedZ: 0.09,
} as const;

/**
 * Whether a bird is inside the flock or on its edge, from how lopsided its seven neighbours are:
 * inside, their centre sits close to it; on the edge, off to one side. Edge birds feel the
 * roost and lead the turns, and the birds inside mostly follow them, which bends the flock.
 */
export const EDGE = {
  /** Neighbours' centre this far off, as a share of the furthest neighbour's distance, or less: inside. */
  inside: 0.25,
  /** This far or more: on the edge. */
  outside: 0.6,
  /** Share of the roost's pull a bird inside the flock still feels. */
  insideShare: 0.15,
} as const;

/** Birds pull up before they reach the trees. */
export const FLOOR = {
  /** Distance above the floor where pulling up starts, in dp on screen. */
  margin: 60,
  /** Upward push per second squared at the floor itself. */
  push: 600,
} as const;

/**
 * Your finger. Birds within its reach flee, hardest right under it, and spread the alarm to
 * their neighbours. The reach is wider than a fingertip, so the gap shows around your finger.
 */
export const FALCON = {
  radius: 120,
  push: 2500,
  /** Keeps the push finite for a bird right under the finger. */
  minDistance: 1,
} as const;

export const PANIC = {
  /** Calm returns at this much per second. */
  decayPerSecond: 2,
  /** Share of a neighbour's alarm a bird takes on each frame. Below 1, so the wave fades as it spreads. */
  carry: 0.9,
  /** Alarmed birds fly up to this much faster. */
  speedBoost: 1,
} as const;

export const WINGS = {
  beatsPerSecond: 9,
  /** Birds flap when slower than this share of cruising speed, and glide otherwise. */
  flapBelow: 0.97,
  /** Alarmed birds always flap. */
  alarmFlap: 0.2,
} as const;

export const CAMERA = {
  /** Distance from the camera to where the world's scale is 1, in dp. */
  distance: 700,
  /**
   * Eye level, as a fraction of screen height: on the horizon, where the world's origin lands.
   * The flock flies well above it, so you look up at it the way you would from the ground.
   */
  centerY: 0.8,
  /** No bird is drawn closer than this share of the focus distance. */
  nearLimit: 0.6,
} as const;

export const BIRD = {
  /** Wingspan of a gliding bird at the focus distance, in dp. */
  spanDp: 8,
} as const;

/** One bird sprite per depth tone per wing pose, all in one strip, heading along +x. Shapes are fractions of `size`. */
export const BIRD_SPRITE = {
  size: 32,
  /** Gliding wingspan. */
  fullSpan: 0.9,
  /** Apparent wingspan through a wingbeat, seen from below: gliding first, then the flap frames. */
  spans: [1, 0.7, 0.4, 0.15],
  /** Order the flap frames play in, back and forth, as indexes into `spans`. */
  flapCycle: [0, 1, 2, 3, 2, 1],
  body: { length: 0.4, width: 0.11 },
  /** The head's centre sits this far ahead of the bird's. */
  head: { ahead: 0.19, radius: 0.055 },
  /** A short square tail, starting this far behind the bird's centre. */
  tail: { behind: 0.14, length: 0.12, rootWidth: 0.06, tipWidth: 0.1 },
  /** Where each wing meets the body (ahead of and behind the centre), how far back its tip sweeps, and how far its leading edge bows forward. */
  wing: { rootFront: 0.07, rootBack: 0.09, sweep: 0.1, leadingBow: 0.55 },
} as const;

/** Near birds are dark and solid; far ones fade toward the haze. */
export const TONES = {
  colors: ['#0B0911', '#191420', '#2A2230', '#3E3343'],
  alphas: [1, 0.9, 0.75, 0.6],
  /** Depth from the nearest tone to the farthest, each way from the focus distance, in dp. */
  depthRange: 300,
} as const;

/** Fractions of screen height, top to bottom. */
export const SKY = {
  colors: ['#141A33', '#3D3557', '#B0687A', '#E9A06A'],
  positions: [0, 0.45, 0.7, 0.82],
  /** Birds stay above this line. */
  floor: 0.74,
} as const;

export const SUN = {
  x: 0.68,
  y: 0.82,
  radius: 0.45,
  color: '#FFC98A',
  alpha: 0.55,
} as const;

/** Far hills: a smooth hazy ridge made of two waves. */
export const HILLS = {
  color: '#4A3550',
  baseline: 0.8,
  amplitudes: [0.012, 0.007],
  /** Waves per screen width. */
  frequencies: [1.3, 3.7],
  /** Distance between ridge points, in dp. */
  step: 4,
} as const;

/** The near treeline: a row of rounded crowns. */
export const TREES = {
  color: '#0E0A12',
  baseline: 0.86,
  /** Crown widths and heights, as fractions of screen width and height. */
  minWidth: 0.04,
  maxWidth: 0.12,
  minHeight: 0.02,
  maxHeight: 0.07,
} as const;

export const TIMING = {
  maxFrameStep: 1 / 30,
  fallbackFrameMs: 1000 / 60,
  msPerSecond: 1000,
} as const;

export const HINT = {
  text: 'Drag through the flock  ·  Your finger is a falcon',
  visibleMs: 3200,
  fadeMs: 700,
  bottomOffset: 40,
} as const;
