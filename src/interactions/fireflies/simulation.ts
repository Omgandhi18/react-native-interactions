// The swarm. Asleep, the fireflies glow faintly in the jar. Woken, they leave one by one, rise
// out of the mouth and settle into lazy loops over the meadow, each flashing on its own clock.
// The clocks are Kuramoto oscillators: each one is nudged toward the swarm's average rhythm, so
// random twinkling slowly turns into the whole meadow flashing together. Positions are in dp.
import { createSeededRandom } from '@/shared/seededRandom';

import { BLINK, FLIGHT, JAR, PULSE, RELEASE, SEED, STARTLE, SWARM } from './constants';
import type { JarLayout } from './jar';
import { windAt } from './wind';

const TWO_PI = Math.PI * 2;

/** Where a firefly is: asleep in the jar, rising out of its mouth, or out in the meadow. */
const ASLEEP = 0;
const RISING = 1;
const OUT = 2;

export type SwarmState = {
  count: number;
  time: number;
  awake: boolean;
  /** When the swarm was woken. */
  wokeAt: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  /** Where each firefly loops in the meadow, and where it sleeps in the jar. */
  homeX: Float32Array;
  homeY: Float32Array;
  sleepX: Float32Array;
  sleepY: Float32Array;
  /** Each firefly's loop: how far and how fast it goes along each axis, and where it starts. */
  wanderX: Float32Array;
  wanderY: Float32Array;
  wanderSpeedX: Float32Array;
  wanderSpeedY: Float32Array;
  wanderStartX: Float32Array;
  wanderStartY: Float32Array;
  /** 0 for the farthest, 1 for the nearest. */
  depth: Float32Array;
  /** Seconds after the wake tap that each one leaves the jar. */
  leavesAfter: Float32Array;
  /** ASLEEP, RISING or OUT. */
  where: Uint8Array;
  /** Where each clock is in its cycle, in radians (it flashes at 0), and how fast it runs on its own. */
  phase: Float32Array;
  frequency: Float32Array;
  brightness: Float32Array;
  /** The Kuramoto order parameter: how in step the flashing fireflies are (0 to 1), and their average phase. */
  order: number;
  meanPhase: number;
  /** Average brightness across the swarm, for lighting the meadow. */
  glow: number;
  /** Share of the swarm still asleep in the jar, for the jar's glow. */
  asleepShare: number;
  jar: JarLayout;
};

/** A normally distributed number with mean 0 and standard deviation 1 (the Box–Muller transform). */
function gaussian(next: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(TWO_PI * next());
}

export function createSwarmState(width: number, height: number, jar: JarLayout): SwarmState {
  const count = SWARM.fireflies;
  const random = createSeededRandom(SEED);
  const floats = () => new Float32Array(count);
  const state: SwarmState = {
    count,
    time: 0,
    awake: false,
    wokeAt: 0,
    x: floats(),
    y: floats(),
    vx: floats(),
    vy: floats(),
    homeX: floats(),
    homeY: floats(),
    sleepX: floats(),
    sleepY: floats(),
    wanderX: floats(),
    wanderY: floats(),
    wanderSpeedX: floats(),
    wanderSpeedY: floats(),
    wanderStartX: floats(),
    wanderStartY: floats(),
    depth: floats(),
    leavesAfter: floats(),
    where: new Uint8Array(count),
    phase: floats(),
    frequency: floats(),
    brightness: floats(),
    order: 0,
    meanPhase: 0,
    glow: 0,
    asleepShare: 1,
    jar,
  };

  const inset = JAR.inset;
  for (let i = 0; i < count; i++) {
    state.homeX[i] = random.range(SWARM.left, SWARM.right) * width;
    state.homeY[i] = random.range(SWARM.top, SWARM.bottom) * height;
    state.sleepX[i] = random.range(jar.centerX - jar.halfWidth + inset, jar.centerX + jar.halfWidth - inset);
    state.sleepY[i] = random.range(jar.bodyTopY + inset, jar.bottomY - inset);
    state.x[i] = state.sleepX[i];
    state.y[i] = state.sleepY[i];
    state.wanderX[i] = random.range(FLIGHT.minWander, FLIGHT.maxWander);
    state.wanderY[i] = random.range(FLIGHT.minWander, FLIGHT.maxWander);
    state.wanderSpeedX[i] = random.range(FLIGHT.minWanderSpeed, FLIGHT.maxWanderSpeed);
    state.wanderSpeedY[i] = random.range(FLIGHT.minWanderSpeed, FLIGHT.maxWanderSpeed);
    state.wanderStartX[i] = random.range(0, TWO_PI);
    state.wanderStartY[i] = random.range(0, TWO_PI);
    state.depth[i] = random.next();
    state.leavesAfter[i] = random.next() * RELEASE.spread;
    state.phase[i] = random.range(0, TWO_PI);
    state.frequency[i] = TWO_PI * (BLINK.meanHz + BLINK.spreadHz * gaussian(random.next));
    state.brightness[i] = BLINK.sleepGlow;
  }
  return state;
}

/** Wakes the swarm. Returns false if it was already awake. */
export function wakeSwarm(state: SwarmState): boolean {
  'worklet';
  if (state.awake) {
    return false;
  }
  state.awake = true;
  state.wokeAt = state.time;
  return true;
}

/** Scatters every firefly's rhythm, and sends the ones near (x, y) darting away. */
export function startleSwarm(state: SwarmState, x: number, y: number) {
  'worklet';
  for (let i = 0; i < state.count; i++) {
    if (state.where[i] === ASLEEP) {
      continue;
    }
    state.phase[i] = Math.random() * TWO_PI;
    const dx = state.x[i] - x;
    const dy = state.y[i] - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0 && distance < STARTLE.radius) {
      const kick = (STARTLE.kick * (1 - distance / STARTLE.radius)) / distance;
      state.vx[i] += dx * kick;
      state.vy[i] += dy * kick;
    }
  }
}

/** A firefly's brightness at a phase: a quick rise at 0, then a fade. */
function flash(phase: number): number {
  'worklet';
  const cycle = phase / TWO_PI;
  if (cycle < BLINK.rise) {
    return cycle / BLINK.rise;
  }
  const left = 1 - (cycle - BLINK.rise) / BLINK.fade;
  return left > 0 ? left * left : 0;
}

/**
 * Advances the swarm by `dt` seconds. Returns true at the moment the swarm flashes together,
 * once it's in step: the instant its average phase passes 0.
 */
export function stepSwarm(state: SwarmState, dt: number): boolean {
  'worklet';
  state.time += dt;
  const { time, x, y, vx, vy, where, phase, frequency, brightness, jar } = state;

  // The Kuramoto mean field: the average phase, as a point on a circle, of the fireflies out in
  // the meadow. Only they feel it, so the swarm finds its rhythm once it has spread out.
  let sumCos = 0;
  let sumSin = 0;
  let flashing = 0;
  for (let i = 0; i < state.count; i++) {
    if (where[i] === OUT) {
      sumCos += Math.cos(phase[i]);
      sumSin += Math.sin(phase[i]);
      flashing++;
    }
  }
  const order = flashing > 0 ? Math.sqrt(sumCos * sumCos + sumSin * sumSin) / flashing : 0;
  const meanPhase = Math.atan2(sumSin, sumCos);
  const pullStrength = BLINK.coupling * order;

  let totalGlow = 0;
  let asleep = 0;
  const turn = Math.min(1, FLIGHT.steering * dt);
  for (let i = 0; i < state.count; i++) {
    if (state.awake && where[i] === ASLEEP && time - state.wokeAt >= state.leavesAfter[i]) {
      where[i] = RISING;
    }

    let targetX: number;
    let targetY: number;
    if (where[i] === ASLEEP) {
      asleep++;
      brightness[i] = BLINK.sleepGlow;
      targetX = state.sleepX[i] + FLIGHT.sleepWander * Math.sin(state.wanderSpeedX[i] * time + state.wanderStartX[i]);
      targetY = state.sleepY[i] + FLIGHT.sleepWander * Math.sin(state.wanderSpeedY[i] * time + state.wanderStartY[i]);
    } else {
      // Each clock runs at its own speed, plus a pull toward the average that's stronger the more in step the rest are.
      const pull = where[i] === OUT ? pullStrength * Math.sin(meanPhase - phase[i]) : 0;
      let next = phase[i] + (frequency[i] + pull) * dt;
      next %= TWO_PI;
      phase[i] = next < 0 ? next + TWO_PI : next;
      brightness[i] = flash(phase[i]);

      if (where[i] === RISING) {
        // Up through the neck and out of the mouth first, then off to its spot.
        targetX = jar.centerX + (state.sleepX[i] - jar.centerX) * (jar.neckHalfWidth / jar.halfWidth);
        targetY = jar.mouthY - RELEASE.rise;
        if (y[i] < jar.mouthY - RELEASE.rise / 2) {
          where[i] = OUT;
        }
      } else {
        // Out in the meadow, the breeze carries them a little.
        targetX =
          state.homeX[i] +
          state.wanderX[i] * Math.sin(state.wanderSpeedX[i] * time + state.wanderStartX[i]) +
          FLIGHT.windDrift * windAt(x[i], time);
        targetY = state.homeY[i] + state.wanderY[i] * Math.sin(state.wanderSpeedY[i] * time + state.wanderStartY[i]);
      }
    }
    totalGlow += brightness[i];

    // Head toward the target, slowing as it gets close, never faster than a firefly flies.
    let wantX = (targetX - x[i]) * FLIGHT.arrive;
    let wantY = (targetY - y[i]) * FLIGHT.arrive;
    const want = Math.sqrt(wantX * wantX + wantY * wantY);
    if (want > FLIGHT.maxSpeed) {
      wantX *= FLIGHT.maxSpeed / want;
      wantY *= FLIGHT.maxSpeed / want;
    }
    vx[i] += (wantX - vx[i]) * turn;
    vy[i] += (wantY - vy[i]) * turn;
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
  }

  const previous = state.meanPhase;
  state.order = order;
  state.meanPhase = meanPhase;
  state.glow = totalGlow / state.count;
  state.asleepShare = asleep / state.count;
  return order >= PULSE.minOrder && previous < 0 && meanPhase >= 0;
}
