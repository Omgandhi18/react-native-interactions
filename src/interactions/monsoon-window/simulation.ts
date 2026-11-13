// The Monsoon window's physics. Everything here runs on the UI thread, once per frame,
// mutating one state object in place so nothing is copied between threads.
//
// Order matters in this file: the worklets Babel plugin turns each 'worklet' function into a
// variable that captures what it calls at the moment it's defined, so worklets aren't hoisted
// like normal functions. Always define a helper above the functions that use it.
import { DROPLETS, GRAVITY, LIGHTNING, RUNNERS, WIPE } from './constants';
import { lerp, mergeRadius, randomRange, shrinkRadius, smoothstep01 } from './math';

export type Point = { x: number; y: number };

/** A still drop of condensation on the glass. */
export type Droplet = Point & { r: number; bornAt: number };

/** A drop heavy enough to run down the glass, collecting droplets and leaving a trail. */
export type Runner = Point & {
  r: number;
  speed: number;
  /** Direction of travel in radians (0 = right, π/2 = down). */
  heading: number;
  stuckUntil: number;
  wobblePhase: number;
  trailDistance: number;
};

/** A patch where the fog has been cleared, by a finger or a runner. */
export type WipeMark = Point & { r: number; bornAt: number };

export type SimulationState = {
  width: number;
  height: number;
  time: number;
  /** Smoothed gravity in screen axes, in g. Straight down is { x: 0, y: 1 }. */
  gravity: Point;
  droplets: Droplet[];
  runners: Runner[];
  wipeMarks: WipeMark[];
  /** Fractional droplets carried over between frames. */
  spawnDebt: number;
  lastWipe: Point | null;
  wipeDistanceSinceHaptic: number;
  lightningStartedAt: number;
  nextLightningAt: number;
};

const NEVER = -1e9;
const STRAIGHT_DOWN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;
/** Offscreen margin before a runner is removed, as a multiple of its radius. */
const OFFSCREEN_MARGIN = 3;
/** A wipe also removes drops whose centre is within this fraction of their radius of the finger. */
const WIPE_DROP_OVERLAP = 0.5;

// ---- Gravity ----

/** Direction gravity pulls along the glass, or null when the phone is lying flat. */
export function gravityAngle(state: SimulationState): number | null {
  'worklet';
  const { x, y } = state.gravity;
  return Math.hypot(x, y) < GRAVITY.minInPlane ? null : Math.atan2(y, x);
}

function smoothGravity(state: SimulationState, target: Point, dt: number) {
  'worklet';
  const blend = Math.min(1, dt * GRAVITY.smoothing);
  state.gravity.x += (target.x - state.gravity.x) * blend;
  state.gravity.y += (target.y - state.gravity.y) * blend;
}

// ---- Droplets ----

function randomDropletRadius(): number {
  'worklet';
  return lerp(DROPLETS.minRadius, DROPLETS.maxRadius, Math.random() ** DROPLETS.sizeBias);
}

/** Adds a droplet, merging it into any droplet it lands on so drops never overlap. */
function addDroplet(state: SimulationState, r: number, x: number, y: number) {
  'worklet';
  for (const droplet of state.droplets) {
    if (Math.hypot(droplet.x - x, droplet.y - y) < droplet.r + r) {
      const merged = mergeRadius(droplet.r, r);
      const share = r ** 3 / merged ** 3;
      droplet.x = lerp(droplet.x, x, share);
      droplet.y = lerp(droplet.y, y, share);
      droplet.r = merged;
      return;
    }
  }
  state.droplets.push({ x, y, r, bornAt: state.time });
}

function spawnDroplets(state: SimulationState, dt: number) {
  'worklet';
  state.spawnDebt += DROPLETS.spawnPerSecond * dt;
  while (state.spawnDebt >= 1) {
    state.spawnDebt -= 1;
    const isHeavy = Math.random() < RUNNERS.heavySpawnChance;
    const radius = isHeavy ? randomRange(RUNNERS.startRadius, RUNNERS.heavyMaxRadius) : randomDropletRadius();
    addDroplet(state, radius, Math.random() * state.width, Math.random() * state.height);
  }
  while (state.droplets.length > DROPLETS.max) {
    state.droplets.shift();
  }
}

/** Droplets that have grown heavy enough start running, if gravity is pulling along the glass. */
function promoteHeavyDroplets(state: SimulationState) {
  'worklet';
  if (gravityAngle(state) === null) {
    return;
  }
  for (let i = state.droplets.length - 1; i >= 0 && state.runners.length < RUNNERS.max; i--) {
    const droplet = state.droplets[i];
    if (droplet.r < RUNNERS.startRadius) {
      continue;
    }
    state.droplets.splice(i, 1);
    state.runners.push({
      x: droplet.x,
      y: droplet.y,
      r: droplet.r,
      speed: 0,
      heading: STRAIGHT_DOWN,
      stuckUntil: state.time + randomRange(RUNNERS.minStartDelay, RUNNERS.maxStartDelay),
      wobblePhase: Math.random() * FULL_TURN,
      trailDistance: 0,
    });
  }
}

// ---- Wipe marks ----

function addWipeMark(state: SimulationState, x: number, y: number, r: number) {
  'worklet';
  state.wipeMarks.push({ x, y, r, bornAt: state.time });
  if (state.wipeMarks.length > WIPE.maxMarks) {
    state.wipeMarks.shift();
  }
}

function expireWipeMarks(state: SimulationState) {
  'worklet';
  const lifetime = WIPE.holdTime + WIPE.returnTime;
  while (state.wipeMarks.length > 0 && state.time - state.wipeMarks[0].bornAt > lifetime) {
    state.wipeMarks.shift();
  }
}

/** How clear a wiped patch still is: 1 right after wiping, fading to 0 as the fog returns. */
export function wipeMarkStrength(mark: WipeMark, time: number): number {
  'worklet';
  return 1 - smoothstep01((time - mark.bornAt - WIPE.holdTime) / WIPE.returnTime);
}

// ---- Runners ----

function updateRunnerSpeed(
  state: SimulationState,
  runner: Runner,
  angle: number | null,
  strength: number,
  dt: number,
) {
  'worklet';
  if (angle === null || state.time < runner.stuckUntil) {
    runner.speed = 0;
    return;
  }
  const target = RUNNERS.baseSpeed * (runner.r / RUNNERS.startRadius) * strength;
  runner.speed += (target - runner.speed) * Math.min(1, dt * RUNNERS.acceleration);
  if (Math.random() < RUNNERS.stickChancePerSecond * dt) {
    runner.stuckUntil = state.time + randomRange(RUNNERS.minStickTime, RUNNERS.maxStickTime);
  }
}

/** Drops a tiny droplet behind the runner and clears a streak through the fog. */
function leaveTrail(state: SimulationState, runner: Runner) {
  'worklet';
  const trailRadius = randomRange(RUNNERS.trailMinRadius, RUNNERS.trailMaxRadius);
  const back = runner.r * RUNNERS.trailBackOffset + trailRadius;
  const sideways = randomRange(-1, 1) * runner.r * RUNNERS.trailJitter;
  const cos = Math.cos(runner.heading);
  const sin = Math.sin(runner.heading);
  state.droplets.push({
    x: runner.x - cos * back - sin * sideways,
    y: runner.y - sin * back + cos * sideways,
    r: trailRadius,
    bornAt: state.time - DROPLETS.growTime,
  });
  runner.r = shrinkRadius(runner.r, trailRadius);
  addWipeMark(state, runner.x, runner.y, runner.r * RUNNERS.trailClearRadius);
}

function absorbDroplets(state: SimulationState, runner: Runner) {
  'worklet';
  for (let j = state.droplets.length - 1; j >= 0; j--) {
    const droplet = state.droplets[j];
    const reach = (runner.r + droplet.r) * RUNNERS.absorbReach;
    const dx = droplet.x - runner.x;
    const dy = droplet.y - runner.y;
    if (Math.abs(dx) > reach || Math.abs(dy) > reach || Math.hypot(dx, dy) > reach) {
      continue;
    }
    runner.r = Math.min(RUNNERS.maxRadius, mergeRadius(runner.r, droplet.r));
    runner.speed += RUNNERS.absorbBoost;
    runner.stuckUntil = Math.min(runner.stuckUntil, state.time);
    state.droplets.splice(j, 1);
  }
}

function isOffscreen(state: SimulationState, runner: Runner): boolean {
  'worklet';
  const margin = runner.r * OFFSCREEN_MARGIN;
  return (
    runner.x < -margin ||
    runner.x > state.width + margin ||
    runner.y < -margin ||
    runner.y > state.height + margin
  );
}

function moveRunners(state: SimulationState, dt: number) {
  'worklet';
  const angle = gravityAngle(state);
  const strength = Math.min(1, Math.hypot(state.gravity.x, state.gravity.y));

  for (let i = state.runners.length - 1; i >= 0; i--) {
    const runner = state.runners[i];
    updateRunnerSpeed(state, runner, angle, strength, dt);
    if (angle !== null) {
      runner.wobblePhase += dt * RUNNERS.meanderSpeed;
      runner.heading = angle + Math.sin(runner.wobblePhase) * RUNNERS.meander;
    }

    const distance = runner.speed * dt;
    runner.x += Math.cos(runner.heading) * distance;
    runner.y += Math.sin(runner.heading) * distance;
    runner.trailDistance += distance;
    if (runner.trailDistance >= RUNNERS.trailSpacing) {
      runner.trailDistance = 0;
      leaveTrail(state, runner);
    }
    absorbDroplets(state, runner);

    if (runner.r < RUNNERS.stopRadius) {
      state.runners.splice(i, 1);
      addDroplet(state, runner.r, runner.x, runner.y);
    } else if (isOffscreen(state, runner)) {
      state.runners.splice(i, 1);
    }
  }
}

// ---- Lightning ----

export function triggerLightning(state: SimulationState) {
  'worklet';
  state.lightningStartedAt = state.time;
  state.nextLightningAt = state.time + randomRange(LIGHTNING.minInterval, LIGHTNING.maxInterval);
}

function updateLightning(state: SimulationState): boolean {
  'worklet';
  if (state.time < state.nextLightningAt) {
    return false;
  }
  triggerLightning(state);
  return true;
}

/** Brightness of the lightning flash right now, from 0 to 1. */
export function lightningIntensity(state: SimulationState): number {
  'worklet';
  const t = state.time - state.lightningStartedAt;
  if (t < 0 || t > LIGHTNING.duration) {
    return 0;
  }
  const first = Math.exp(-t * LIGHTNING.firstDecay);
  const second =
    t < LIGHTNING.secondFlashAt
      ? 0
      : LIGHTNING.secondStrength * Math.exp(-(t - LIGHTNING.secondFlashAt) * LIGHTNING.secondDecay);
  return Math.min(1, first + second);
}

// ---- Public: create and step ----

export function createInitialState(width: number, height: number): SimulationState {
  'worklet';
  const state: SimulationState = {
    width,
    height,
    time: 0,
    gravity: { x: 0, y: 1 },
    droplets: [],
    runners: [],
    wipeMarks: [],
    spawnDebt: 0,
    lastWipe: null,
    wipeDistanceSinceHaptic: 0,
    lightningStartedAt: NEVER,
    nextLightningAt: randomRange(LIGHTNING.firstMinDelay, LIGHTNING.firstMaxDelay),
  };
  for (let i = 0; i < DROPLETS.initialCount; i++) {
    addDroplet(state, randomDropletRadius(), Math.random() * width, Math.random() * height);
  }
  return state;
}

/** Advances the simulation by `dt` seconds. Returns true when lightning strikes this frame. */
export function stepSimulation(state: SimulationState, dt: number, gravityTarget: Point): boolean {
  'worklet';
  state.time += dt;
  smoothGravity(state, gravityTarget, dt);
  spawnDroplets(state, dt);
  promoteHeavyDroplets(state);
  moveRunners(state, dt);
  expireWipeMarks(state);
  return updateLightning(state);
}

// ---- Public: wiping the fog ----

function removeWithin<T extends Point & { r: number }>(items: T[], x: number, y: number, radius: number) {
  'worklet';
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (Math.hypot(item.x - x, item.y - y) < radius + item.r * WIPE_DROP_OVERLAP) {
      items.splice(i, 1);
    }
  }
}

/**
 * Wipes from the previous finger position to (x, y).
 * Returns true when it's time for a haptic tick (on touch down, then every few dp).
 */
export function wipeTo(state: SimulationState, x: number, y: number): boolean {
  'worklet';
  const isTouchDown = state.lastWipe === null;
  const from = state.lastWipe ?? { x, y };
  const dx = x - from.x;
  const dy = y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / (WIPE.radius * WIPE.spacing)));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = from.x + dx * t;
    const py = from.y + dy * t;
    addWipeMark(state, px, py, WIPE.radius);
    removeWithin(state.droplets, px, py, WIPE.radius);
    removeWithin(state.runners, px, py, WIPE.radius);
  }

  state.lastWipe = { x, y };
  state.wipeDistanceSinceHaptic += distance;
  if (isTouchDown || state.wipeDistanceSinceHaptic >= WIPE.hapticSpacing) {
    state.wipeDistanceSinceHaptic = 0;
    return true;
  }
  return false;
}

export function endWipe(state: SimulationState) {
  'worklet';
  state.lastWipe = null;
}
