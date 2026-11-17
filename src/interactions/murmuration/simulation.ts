// The flock. Every starling steers by Reynolds' three boids rules (keep your distance, fly the
// way your neighbours fly, stay with them), applied to its seven nearest neighbours. On top of
// that: a pull back toward a drifting roost, pulling up before the trees, and fleeing the
// falcon under your finger. Alarm spreads from bird to bird, fading with each one it passes.
// World positions are dp, x right, y down and z away, with the origin at eye level on the
// horizon, in the middle of the screen, at the camera's focus distance.
import { createSeededRandom } from '@/shared/seededRandom';

import { CAMERA, EDGE, FALCON, FLIGHT, FLOCK, FLOOR, PANIC, ROOST, SEED, SKY, WINGS } from './constants';
import type { NeighbourLists, SpatialHash } from './spatialHash';
import { buildSpatialHash, createNeighbourLists, createSpatialHash, findNeighbours } from './spatialHash';

/** A heading in the x–z plane straight at the camera. */
const TOWARD_YOU = -Math.PI / 2;
const SEPARATION_SQUARED = FLIGHT.separationDistance * FLIGHT.separationDistance;
const FALCON_RADIUS_SQUARED = FALCON.radius * FALCON.radius;

export type FlockState = {
  count: number;
  time: number;
  /** Frames stepped so far; picks which share of the flock looks for neighbours and steers. */
  frame: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
  /** How alarmed each bird is, from 0 to 1. */
  panic: Float32Array;
  /** Where each bird is in its wingbeat, from 0 to 1, and whether it's flapping or gliding. */
  wingPhase: Float32Array;
  flapping: Uint8Array;
  /** Each bird's place on screen relative to eye level's, and how much perspective scales it. */
  screenX: Float32Array;
  screenY: Float32Array;
  depthScale: Float32Array;
  neighbours: NeighbourLists;
  hash: SpatialHash;
  /** Where eye level (the world's origin) is on screen, and the floor's height relative to it. */
  centerX: number;
  centerY: number;
  floorY: number;
  roostRadiusX: number;
  roostRadiusY: number;
  /** How far above eye level the roost flies, in dp. */
  roostHeight: number;
  roostRadiusZ: number;
  roamX: number;
  roamY: number;
  roamZ: number;
  fingerDown: boolean;
  /** Relative to eye level's place on screen, like `screenX` and `screenY`. */
  fingerX: number;
  fingerY: number;
};

export function createFlockState(width: number, height: number): FlockState {
  const count = FLOCK.birds;
  const random = createSeededRandom(SEED);
  const state: FlockState = {
    count,
    time: 0,
    frame: 0,
    x: new Float32Array(count),
    y: new Float32Array(count),
    z: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    vz: new Float32Array(count),
    panic: new Float32Array(count),
    wingPhase: new Float32Array(count),
    flapping: new Uint8Array(count),
    screenX: new Float32Array(count),
    screenY: new Float32Array(count),
    depthScale: new Float32Array(count).fill(1),
    neighbours: createNeighbourLists(count),
    hash: createSpatialHash(count),
    centerX: width / 2,
    centerY: height * CAMERA.centerY,
    floorY: height * (SKY.floor - CAMERA.centerY),
    roostRadiusX: width * ROOST.radiusX,
    roostRadiusY: height * ROOST.radiusY,
    roostHeight: height * ROOST.height,
    roostRadiusZ: ROOST.radiusZ,
    roamX: width * ROOST.roamX,
    roamY: height * ROOST.roamY,
    roamZ: ROOST.roamZ,
    fingerDown: false,
    fingerX: 0,
    fingerY: 0,
  };

  // A loose stream inside the roost, coming toward you.
  for (let i = 0; i < count; i++) {
    let ex: number;
    let ey: number;
    let ez: number;
    do {
      ex = random.range(-1, 1);
      ey = random.range(-1, 1);
      ez = random.range(-1, 1);
    } while (ex * ex + ey * ey + ez * ez > 1);
    state.x[i] = ex * state.roostRadiusX * FLOCK.startSpread[0];
    state.y[i] = ey * state.roostRadiusY * FLOCK.startSpread[1] - state.roostHeight;
    state.z[i] = ez * state.roostRadiusZ * FLOCK.startSpread[2];
    const angle = TOWARD_YOU + random.range(-FLOCK.startScatter, FLOCK.startScatter);
    state.vx[i] = Math.cos(angle) * FLIGHT.cruiseSpeed;
    state.vy[i] = random.range(-FLOCK.startClimb, FLOCK.startClimb) * FLIGHT.cruiseSpeed;
    state.vz[i] = Math.sin(angle) * FLIGHT.cruiseSpeed;
    state.wingPhase[i] = random.next();
  }
  return state;
}

export function moveFalcon(state: FlockState, x: number, y: number) {
  'worklet';
  state.fingerDown = true;
  state.fingerX = x - state.centerX;
  state.fingerY = y - state.centerY;
}

export function liftFalcon(state: FlockState) {
  'worklet';
  state.fingerDown = false;
}

/** Works out one bird's new velocity and alarm from everything pulling on it. */
function steerBird(state: FlockState, bird: number, dt: number, roostX: number, roostY: number, roostZ: number) {
  'worklet';
  const { x, y, z, vx, vy, vz, panic, neighbours } = state;
  const px = x[bird];
  const py = y[bird];
  const pz = z[bird];
  let ax = 0;
  let ay = 0;
  let az = 0;
  let alarm = Math.max(0, panic[bird] - PANIC.decayPerSecond * dt);

  // A bird with no neighbours is all edge.
  let edge = 1;
  const count = neighbours.counts[bird];
  if (count > 0) {
    const base = bird * neighbours.size;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let sumVx = 0;
    let sumVy = 0;
    let sumVz = 0;
    for (let k = 0; k < count; k++) {
      const other = neighbours.indices[base + k];
      const ox = x[other];
      const oy = y[other];
      const oz = z[other];
      sumX += ox;
      sumY += oy;
      sumZ += oz;
      sumVx += vx[other];
      sumVy += vy[other];
      sumVz += vz[other];
      const dx = px - ox;
      const dy = py - oy;
      const dz = pz - oz;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      if (distanceSquared > 0 && distanceSquared < SEPARATION_SQUARED) {
        const distance = Math.sqrt(distanceSquared);
        const push = (FLIGHT.separation * (1 - distance / FLIGHT.separationDistance)) / distance;
        ax += dx * push;
        ay += dy * push;
        az += dz * push;
      }
      const heard = panic[other] * PANIC.carry;
      if (heard > alarm) {
        alarm = heard;
      }
    }
    const share = 1 / count;
    const towardX = sumX * share - px;
    const towardY = sumY * share - py;
    const towardZ = sumZ * share - pz;
    ax += FLIGHT.alignment * (sumVx * share - vx[bird]) + FLIGHT.cohesion * towardX;
    ay += FLIGHT.alignment * (sumVy * share - vy[bird]) + FLIGHT.cohesion * towardY;
    az += FLIGHT.alignment * (sumVz * share - vz[bird]) + FLIGHT.cohesion * towardZ;
    // How far off-centre its neighbours sit, against how far the furthest is.
    const furthest = Math.sqrt(neighbours.distances[base + count - 1]);
    const lopsided = furthest > 0 ? Math.sqrt(towardX * towardX + towardY * towardY + towardZ * towardZ) / furthest : 1;
    edge = Math.min(1, Math.max(0, (lopsided - EDGE.inside) / (EDGE.outside - EDGE.inside)));
  }

  // A gentle pull toward the roost that never lets go. Sideways, it's felt mostly by birds on
  // the flock's edge, so they lead its turns and the rest follow. Every bird keeps to the roost's
  // height, which flattens the flock into a sheet. Then a hard pull past the roost's edge.
  const lead = EDGE.insideShare + (1 - EDGE.insideShare) * edge;
  ax += (roostX - px) * ROOST.spring.x * lead;
  ay += (roostY - py) * ROOST.spring.y;
  az += (roostZ - pz) * ROOST.spring.z * lead;
  const outX = (px - roostX) / state.roostRadiusX;
  const outY = (py - roostY) / state.roostRadiusY;
  const outZ = (pz - roostZ) / state.roostRadiusZ;
  const reach = Math.sqrt(outX * outX + outY * outY + outZ * outZ);
  if (reach > 1) {
    const pull = (ROOST.pull * (reach - 1)) / reach;
    ax += (roostX - px) * pull;
    ay += (roostY - py) * pull;
    az += (roostZ - pz) * pull;
  }

  // Up and away from the trees.
  const pullUpFrom = state.floorY - FLOOR.margin;
  if (state.screenY[bird] > pullUpFrom) {
    ay -= (FLOOR.push * (state.screenY[bird] - pullUpFrom)) / FLOOR.margin;
  }

  // Away from the falcon, on screen, since that's where the finger is.
  if (state.fingerDown) {
    const fx = state.screenX[bird] - state.fingerX;
    const fy = state.screenY[bird] - state.fingerY;
    const distanceSquared = fx * fx + fy * fy;
    if (distanceSquared < FALCON_RADIUS_SQUARED) {
      const distance = Math.max(FALCON.minDistance, Math.sqrt(distanceSquared));
      const near = 1 - distance / FALCON.radius;
      const push = (FALCON.push * near) / (distance * state.depthScale[bird]);
      ax += fx * push;
      ay += fy * push;
      if (near > alarm) {
        alarm = near;
      }
    }
  }

  // Starlings hold their height more than their heading, which flattens the flock into sheets.
  ay -= FLIGHT.levelling * vy[bird];
  ax += (Math.random() - 0.5) * FLIGHT.wander;
  ay += (Math.random() - 0.5) * FLIGHT.wander;
  az += (Math.random() - 0.5) * FLIGHT.wander;

  // Ease back to cruising speed, which alarm raises.
  const nx = vx[bird] + ax * dt;
  const ny = vy[bird] + ay * dt;
  const nz = vz[bird] + az * dt;
  const speed = Math.sqrt(nx * nx + ny * ny + nz * nz);
  const boost = 1 + PANIC.speedBoost * alarm;
  const cruise = FLIGHT.cruiseSpeed * boost;
  const eased = speed + (cruise - speed) * Math.min(1, FLIGHT.speedHold * dt);
  const target = Math.min(FLIGHT.maxSpeed * boost, Math.max(FLIGHT.minSpeed, eased));
  const scale = speed > 0 ? target / speed : 0;
  vx[bird] = nx * scale;
  vy[bird] = ny * scale;
  vz[bird] = nz * scale;

  panic[bird] = alarm;
  state.flapping[bird] = speed < cruise * WINGS.flapBelow || alarm > WINGS.alarmFlap ? 1 : 0;
}

/** Moves every bird along its velocity and works out where it lands on screen. */
function moveBirds(state: FlockState, dt: number) {
  'worklet';
  const { x, y, z, vx, vy, vz, wingPhase, flapping } = state;
  const nearest = -CAMERA.distance * CAMERA.nearLimit;
  for (let i = 0; i < state.count; i++) {
    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;
    z[i] += vz[i] * dt;
    const scale = CAMERA.distance / (CAMERA.distance + Math.max(nearest, z[i]));
    state.screenX[i] = x[i] * scale;
    state.screenY[i] = y[i] * scale;
    state.depthScale[i] = scale;
    if (flapping[i] === 1) {
      wingPhase[i] = (wingPhase[i] + WINGS.beatsPerSecond * dt) % 1;
    }
  }
}

export function stepFlock(state: FlockState, dt: number) {
  'worklet';
  state.time += dt;
  const { time } = state;

  buildSpatialHash(state.hash, state);
  const { frame } = state;
  state.frame = frame + 1;
  const searching = frame % FLOCK.searchGroups;
  for (let i = 0; i < state.count; i++) {
    if (frame === 0 || i % FLOCK.searchGroups === searching) {
      findNeighbours(state.hash, state, state.neighbours, i);
    }
  }

  const roostX = state.roamX * Math.sin(time * ROOST.roamSpeedX);
  const roostY = state.roamY * Math.sin(time * ROOST.roamSpeedY) - state.roostHeight;
  const roostZ = state.roamZ * Math.sin(time * ROOST.roamSpeedZ) - ROOST.nearer;
  // Each bird steers every few frames, over the time since it last did, but moves every frame.
  const steering = frame % FLOCK.steerGroups;
  for (let i = steering; i < state.count; i += FLOCK.steerGroups) {
    steerBird(state, i, dt * FLOCK.steerGroups, roostX, roostY, roostZ);
  }
  moveBirds(state, dt);
}
