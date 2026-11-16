// Marble Dust's physics. Everything here runs on the UI thread, once per frame, mutating one state
// object of typed arrays in place so nothing is copied between threads.
//
// Each grain has a home on the statue's surface and an offset from it. A spring pulls the offset
// back to zero; swipes and taps knock it away. The statue itself only sways, so the home moves with
// the sway and the offset rides on top, in screen-aligned axes.
//
// Order matters in this file: the worklets Babel plugin turns each 'worklet' function into a
// variable that captures what it calls at the moment it's defined, so worklets aren't hoisted
// like normal functions. Always define a helper above the functions that use it.
import { createSeededRandom } from '@/shared/seededRandom';

import { BLAST, GRAIN, LIGHT, SPRING, STATUE, SWIPE } from './constants';
import type { ScanPoints } from './scan';

const TAU = Math.PI * 2;
const SEED = 1504;
/** Stops a grain exactly under the finger or tap from dividing by zero. */
const MIN_DISTANCE = 0.001;
const LIGHT_LENGTH = Math.hypot(...LIGHT.direction);
const LIGHT_X = LIGHT.direction[0] / LIGHT_LENGTH;
const LIGHT_Y = LIGHT.direction[1] / LIGHT_LENGTH;
const LIGHT_Z = LIGHT.direction[2] / LIGHT_LENGTH;

export type Finger = {
  active: boolean;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

export type DustState = {
  count: number;
  time: number;
  /** Screen position of the statue's centre, dp per statue unit, and the camera distance in dp. */
  centerX: number;
  centerY: number;
  scale: number;
  cameraDistance: number;
  /** x, y, z per grain, in statue units. */
  home: Float32Array;
  normal: Float32Array;
  /** How much of the light each grain loses to sitting in a crevice (0–1). */
  shadow: Float32Array;
  /** Spring stiffness and damping per grain. */
  stiffness: Float32Array;
  damping: Float32Array;
  /** Per-grain randomness: burst speed multiplier, and which way (−1 to 1) it flies in depth. */
  burstSpeed: Float32Array;
  depthKick: Float32Array;
  /** x, y, z per grain, in dp: how far it has been knocked from home, and how fast it's moving. */
  offset: Float32Array;
  velocity: Float32Array;
  /** What the renderer draws: centre, diameter and brightness (0 = hidden, 1 = fully lit) of each grain. */
  screenX: Float32Array;
  screenY: Float32Array;
  size: Float32Array;
  brightness: Float32Array;
  finger: Finger;
  /** A tap waiting to burst the grains on the next frame. */
  pendingBlast: { x: number; y: number } | null;
  lastScatterTickAt: number;
};

export function createDustState(scan: ScanPoints, width: number, height: number): DustState {
  const { count } = scan;
  const random = createSeededRandom(SEED);
  const stiffness = new Float32Array(count);
  const damping = new Float32Array(count);
  const burstSpeed = new Float32Array(count);
  const depthKick = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    stiffness[i] = SPRING.stiffness * random.range(SPRING.stiffnessMin, SPRING.stiffnessMax);
    damping[i] = 2 * SPRING.dampingRatio * Math.sqrt(stiffness[i]);
    burstSpeed[i] = random.range(BLAST.speedMin, BLAST.speedMax);
    depthKick[i] = random.range(-1, 1);
  }
  const scale = Math.min(
    (height * STATUE.maxHeightFraction) / 2,
    (width * STATUE.maxWidthFraction) / (2 * scan.halfWidth),
  );

  return {
    count,
    time: 0,
    centerX: width / 2,
    centerY: height * STATUE.centerY,
    scale,
    cameraDistance: STATUE.cameraDistance * scale,
    home: scan.positions,
    normal: scan.normals,
    shadow: scan.occlusion.map((occlusion) => occlusion * LIGHT.occlusion),
    stiffness,
    damping,
    burstSpeed,
    depthKick,
    offset: new Float32Array(count * 3),
    velocity: new Float32Array(count * 3),
    screenX: new Float32Array(count),
    screenY: new Float32Array(count),
    size: new Float32Array(count),
    brightness: new Float32Array(count),
    finger: { active: false, x: 0, y: 0, velocityX: 0, velocityY: 0 },
    pendingBlast: null,
    lastScatterTickAt: 0,
  };
}

export function moveFinger(state: DustState, x: number, y: number, velocityX: number, velocityY: number) {
  'worklet';
  const { finger } = state;
  finger.active = true;
  finger.x = x;
  finger.y = y;
  finger.velocityX = velocityX;
  finger.velocityY = velocityY;
}

export function liftFinger(state: DustState) {
  'worklet';
  state.finger.active = false;
}

export function queueBlast(state: DustState, x: number, y: number) {
  'worklet';
  state.pendingBlast = { x, y };
}

/**
 * Advances every grain by `dt` seconds and works out where to draw it.
 * Returns how many grains a moving finger knocked this frame, for the haptics.
 *
 * This loop runs over every grain every frame on Hermes, which interprets it (there is no JIT),
 * so it avoids helper calls and Math.pow, and grains at rest skip the spring maths.
 */
export function stepDust(state: DustState, dt: number): number {
  'worklet';
  state.time += dt;
  const { home, normal, offset, velocity, finger, screenX, screenY, size, brightness } = state;
  const { scale, cameraDistance, centerX, centerY } = state;
  const sway = STATUE.swayAngle * Math.sin((state.time * TAU) / STATUE.swayPeriod);
  const cos = Math.cos(sway);
  const sin = Math.sin(sway);
  const blast = state.pendingBlast;
  state.pendingBlast = null;
  const radiusSquared = SWIPE.radius * SWIPE.radius;
  const fingerSpeed = Math.hypot(finger.velocityX, finger.velocityY);
  const nearestDepth = cameraDistance / GRAIN.maxPerspective;
  const facingRange = GRAIN.showFacing - GRAIN.hideFacing;
  let grainsKnocked = 0;

  for (let i = 0; i < state.count; i++) {
    const p = i * 3;
    let vx = velocity[p];
    let vy = velocity[p + 1];
    let vz = velocity[p + 2];
    let ox = offset[p];
    let oy = offset[p + 1];
    let oz = offset[p + 2];

    if (blast) {
      // Burst away from the tap in the screen plane, and toward or away from you.
      const dx = screenX[i] - blast.x;
      const dy = screenY[i] - blast.y;
      const distance = Math.max(MIN_DISTANCE, Math.hypot(dx, dy));
      const dz = state.depthKick[i] * distance * BLAST.depthShare;
      const length = Math.hypot(distance, dz);
      const speed = (BLAST.speed * state.burstSpeed[i]) / (1 + distance / BLAST.falloff);
      vx += (dx / length) * speed;
      vy += (dy / length) * speed;
      vz += (dz / length) * speed;
    }

    if (finger.active) {
      const dx = screenX[i] - finger.x;
      const dy = screenY[i] - finger.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < radiusSquared) {
        // Grains under the finger are dragged along with it and pushed out from the fingertip.
        const distance = Math.max(MIN_DISTANCE, Math.sqrt(distanceSquared));
        const reach = 1 - distance / SWIPE.radius;
        const strength = reach * reach * dt;
        vx += (finger.velocityX * SWIPE.drag + (dx / distance) * SWIPE.push) * strength;
        vy += (finger.velocityY * SWIPE.drag + (dy / distance) * SWIPE.push) * strength;
        vz += state.depthKick[i] * fingerSpeed * SWIPE.depthDrag * strength;
        if (fingerSpeed > SWIPE.minTickSpeed) {
          grainsKnocked++;
        }
      }
    }

    const displacement = Math.abs(ox) + Math.abs(oy) + Math.abs(oz);
    if (displacement + Math.abs(vx) + Math.abs(vy) + Math.abs(vz) > GRAIN.restThreshold) {
      // Spring home. Velocity first, then position (semi-implicit Euler), which stays stable.
      const k = state.stiffness[i];
      const c = state.damping[i];
      vx += (-k * ox - c * vx) * dt;
      vy += (-k * oy - c * vy) * dt;
      vz += (-k * oz - c * vz) * dt;
      ox += vx * dt;
      oy += vy * dt;
      oz += vz * dt;
    } else {
      vx = vy = vz = ox = oy = oz = 0;
    }
    velocity[p] = vx;
    velocity[p + 1] = vy;
    velocity[p + 2] = vz;
    offset[p] = ox;
    offset[p + 1] = oy;
    offset[p + 2] = oz;

    // Sway the home and normal about the vertical axis.
    const hx = home[p] * cos + home[p + 2] * sin;
    const hz = home[p + 2] * cos - home[p] * sin;
    const nx = normal[p] * cos + normal[p + 2] * sin;
    const ny = normal[p + 1];
    const nz = normal[p + 2] * cos - normal[p] * sin;

    // Perspective projection. Screen y points down, statue y points up.
    const x = hx * scale + ox;
    const y = -home[p + 1] * scale + oy;
    const z = hz * scale + oz;
    const perspective = cameraDistance / Math.max(cameraDistance - z, nearestDepth);
    screenX[i] = centerX + x * perspective;
    screenY[i] = centerY + y * perspective;
    size[i] = GRAIN.size * perspective;

    // Light: a key light and a dim fill, darkened in crevices, plus a thin rim (cubed falloff)
    // where the surface turns away.
    const lambert = Math.max(0, nx * LIGHT_X + ny * LIGHT_Y + nz * LIGHT_Z);
    const edge = 1 - Math.abs(nz);
    const lit = Math.min(
      1,
      (LIGHT.ambient + LIGHT.diffuse * lambert) * (1 - state.shadow[i]) + edge * edge * edge * LIGHT.rim,
    );
    // Fade out grains facing away (smoothstep), unless they've been knocked loose.
    const turn = Math.min(1, Math.max(0, (nz - GRAIN.hideFacing) / facingRange));
    const facing = turn * turn * (3 - 2 * turn);
    const loose = Math.min(1, displacement / GRAIN.revealDistance);
    brightness[i] = Math.max(lit * facing, loose * GRAIN.looseBrightness);
  }

  return grainsKnocked;
}
