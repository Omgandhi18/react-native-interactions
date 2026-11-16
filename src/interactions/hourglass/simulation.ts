// Hourglass's physics: falling sand on a grid, stepped on the UI thread.
//
// The glass is a grid of cells, each empty, a wall, or holding one grain. Every step, each grain
// tries to move one cell along gravity and, failing that, one cell diagonally either side, or two
// across and one down where the slope is steep enough. Sand at rest holds slopes up to about 34°,
// like real sand, and rolling sand runs on down gentler ones until it randomly loses its momentum,
// so slopes come out uneven rather than as flat 45° faces.
//
// A grain with clear space ahead speeds up and covers several cells a step, unless it is only
// following the grain in front of it: then it moves one cell. That keeps the packed column in the
// neck moving one cell a step, so the sand runs out at the same rate whether the upper bulb is full
// or nearly empty, which is how a real hourglass keeps time.
//
// Everything is typed arrays mutated in place, so nothing is copied between threads. The worklets
// Babel plugin captures what a worklet calls at the moment it's defined, so helpers come first.
import { createSeededRandom } from '@/shared/seededRandom';

import { GLASS, HAPTICS, SAND } from './constants';
import { glassHalfWidth } from './glass';
import type { GlassLayout } from './glass';

const EMPTY = -1;
const WALL = -2;
const SEED = 1574;
/** The eight neighbours, clockwise from the right (y points down the glass). */
const STEP_X = [1, 1, 0, -1, -1, -1, 0, 1];
const STEP_Y = [0, 1, 1, 1, 0, -1, -1, -1];
const DIRECTIONS = 8;
const EIGHTH_TURN = Math.PI / 4;
const UINT32_RANGE = 4294967296;
/** With less sideways pull than this, rows or columns are visited in alternating order so piles don't lean. */
const LEVEL = 0.01;

export type SandState = {
  count: number;
  /** Grid size in cells, not counting the wall border all round, and the length of a grid row with it. */
  columns: number;
  rows: number;
  stride: number;
  /** Side of one cell, in dp. */
  cell: number;
  /** Each cell's grain index, or EMPTY or WALL. */
  grid: Int16Array;
  /** The first and last grid column inside the glass, for each grid row. */
  rowStart: Int16Array;
  rowEnd: Int16Array;
  /** The step each cell last lost its grain, so a grain can tell it's only following another one. */
  vacatedAt: Int32Array;
  /** Each grain's cell, as an index into `grid`. */
  cellOf: Int32Array;
  /** Each grain's speed in cells per step: 1 unless it's falling freely. */
  speed: Float32Array;
  /** The step each grain last moved: a grain moved this step isn't moved again, and one moved last step is rolling. */
  movedAt: Int32Array;
  /** Per-grain looks: which sand tone, and how far off its cell's centre to draw it (in cells). */
  tone: Uint8Array;
  jitterX: Float32Array;
  jitterY: Float32Array;
  /** Free fall in cells per step: speed gained each step, and the top speed. */
  acceleration: number;
  maxSpeed: number;
  step: number;
  /** Time not yet simulated, in steps. */
  stepCarry: number;
  seed: number;
  /** Which way gravity pulls, in the glass's own axes, as a unit vector. */
  gravityX: number;
  gravityY: number;
  /** Whether running out should buzz: set once the upper bulb has sand in it again. */
  runOutArmed: boolean;
};

export function createSandState(layout: GlassLayout): SandState {
  const { columns, rows, cell } = layout;
  // A wall border all round means a grain looking at a neighbour never needs a bounds check.
  const stride = columns + 2;
  const grid = new Int16Array(stride * (rows + 2)).fill(WALL);
  const rowStart = new Int16Array(rows + 2);
  const rowEnd = new Int16Array(rows + 2);
  const centerColumn = columns / 2;
  for (let row = 1; row <= rows; row++) {
    // Open the cells that sit wholly inside the glass, counting out from the centre line.
    const perSide = Math.min(centerColumn, Math.floor(glassHalfWidth(layout, (row - 0.5 - rows / 2) * cell) / cell));
    rowStart[row] = centerColumn - perSide + 1;
    rowEnd[row] = centerColumn + perSide;
    grid.fill(EMPTY, row * stride + rowStart[row], row * stride + rowEnd[row] + 1);
  }

  // Pour the sand into the upper bulb, settled flat: from the neck up, each row from the middle out.
  const cellOf = new Int32Array(SAND.grains);
  let count = 0;
  for (let row = rows / 2; row >= 1 && count < SAND.grains; row--) {
    for (let out = 0; out < rowEnd[row] - centerColumn && count < SAND.grains; out++) {
      for (const column of [centerColumn - out, centerColumn + 1 + out]) {
        if (count < SAND.grains) {
          const index = row * stride + column;
          grid[index] = count;
          cellOf[count] = index;
          count++;
        }
      }
    }
  }

  const random = createSeededRandom(SEED);
  const tone = new Uint8Array(count);
  const jitterX = new Float32Array(count);
  const jitterY = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    tone[i] = Math.floor(random.next() * SAND.tones.length);
    jitterX[i] = random.range(-SAND.jitter, SAND.jitter);
    jitterY[i] = random.range(-SAND.jitter, SAND.jitter);
  }

  return {
    count,
    columns,
    rows,
    stride,
    cell,
    grid,
    rowStart,
    rowEnd,
    vacatedAt: new Int32Array(grid.length),
    cellOf: cellOf.slice(0, count),
    speed: new Float32Array(count).fill(1),
    movedAt: new Int32Array(count),
    tone,
    jitterX,
    jitterY,
    acceleration: SAND.fallAcceleration / cell / (SAND.stepsPerSecond * SAND.stepsPerSecond),
    maxSpeed: SAND.maxFallSpeed / cell / SAND.stepsPerSecond,
    step: 0,
    stepCarry: 0,
    seed: SEED,
    gravityX: 0,
    gravityY: 1,
    runOutArmed: true,
  };
}

/** Xorshift: a fast random number from 0 to 1. */
function nextRandom(state: SandState): number {
  'worklet';
  let x = state.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x;
  return (x >>> 0) / UINT32_RANGE;
}

/** Whether a cell is open for a slope: empty, or holding sand that's flowing and so holds nothing up. */
function isOpen(grid: Int16Array, movedAt: Int32Array, step: number, cell: number): boolean {
  'worklet';
  const grain = grid[cell];
  return grain === EMPTY || (grain >= 0 && movedAt[grain] >= step - 1);
}

/**
 * Whether a grain at a pile's edge, with an empty cell beside it `across`, can roll off that way: the
 * slope there must fall two cells within three across for sand at rest (about 34°, like real sand),
 * or one within two for a grain still rolling (about 27°). Looking three cells out, not one, means
 * this works whatever the shape of the staircase the slope makes on the grid. Flowing sand counts
 * as open, so still sand under a moving layer slumps with it, rather than the layer peeling off a
 * too-steep face one grain at a time.
 */
function slopeFallsAway(
  grid: Int16Array,
  movedAt: Int32Array,
  step: number,
  index: number,
  across: number,
  down: number,
  rolling: boolean,
): boolean {
  'worklet';
  const twoAcross = index + 2 * across;
  if (!isOpen(grid, movedAt, step, twoAcross)) {
    return false;
  }
  if (rolling) {
    return isOpen(grid, movedAt, step, twoAcross + down);
  }
  const threeAcross = twoAcross + across;
  return (
    isOpen(grid, movedAt, step, threeAcross) &&
    isOpen(grid, movedAt, step, threeAcross + down) &&
    isOpen(grid, movedAt, step, threeAcross + 2 * down)
  );
}

/**
 * Moves every grain one step. This runs over the whole grid a few times a frame on Hermes, which
 * interprets it (there is no JIT), so it avoids helper calls in the per-grain path.
 */
function runStep(state: SandState) {
  'worklet';
  const { grid, vacatedAt, cellOf, speed, movedAt, stride, rowStart, rowEnd, rows } = state;
  const { gravityX, gravityY, acceleration, maxSpeed } = state;
  state.step += 1;
  const step = state.step;

  // This step's way down: one of the two neighbours either side of gravity, picked at random in
  // proportion to how close each is, so a slight tilt makes the sand drift.
  const sector = (Math.atan2(gravityY, gravityX) / EIGHTH_TURN + DIRECTIONS) % DIRECTIONS;
  const below = Math.floor(sector);
  const down = (nextRandom(state) < sector - below ? below + 1 : below) % DIRECTIONS;
  const downOffset = STEP_Y[down] * stride + STEP_X[down];
  // Failing that, one of the two neighbours 45° either side of it.
  const sideA = (down + 1) % DIRECTIONS;
  const sideB = (down + DIRECTIONS - 1) % DIRECTIONS;
  const sideAOffset = STEP_Y[sideA] * stride + STEP_X[sideA];
  const sideBOffset = STEP_Y[sideB] * stride + STEP_X[sideB];
  // Square across from the way down, for rolling off the edge of a pile.
  const acrossA = (down + 2) % DIRECTIONS;
  const acrossB = (down + DIRECTIONS - 2) % DIRECTIONS;
  const acrossAOffset = STEP_Y[acrossA] * stride + STEP_X[acrossA];
  const acrossBOffset = STEP_Y[acrossB] * stride + STEP_X[acrossB];

  // Visit the cells furthest along gravity first, so a whole column can fall together in one step.
  const rowStep = Math.abs(gravityY) < LEVEL ? (step & 1 ? 1 : -1) : gravityY > 0 ? -1 : 1;
  const columnStep = Math.abs(gravityX) < LEVEL ? (step & 2 ? 1 : -1) : gravityX > 0 ? -1 : 1;

  for (let row = rowStep < 0 ? rows : 1; row >= 1 && row <= rows; row += rowStep) {
    const first = row * stride + rowStart[row];
    const last = row * stride + rowEnd[row];
    const start = columnStep < 0 ? last : first;
    // In the neck, sand follows strictly (see below): that's what keeps the glass running at one rate.
    const inNeck = rowEnd[row] - rowStart[row] + 1 <= GLASS.neckCells;

    // Straight down first, across the whole row. If grains slid diagonally into the gaps first, the
    // gaps would climb out to the walls and the sand would drain from its edges, not from a crater
    // in the middle.
    for (let index = start; index >= first && index <= last; index += columnStep) {
      const grain = grid[index];
      if (grain < 0 || movedAt[grain] === step) {
        continue;
      }
      let target = index + downOffset;
      if (grid[target] !== EMPTY) {
        continue;
      }
      if (vacatedAt[target] === step) {
        // Following the grain ahead down, so no faster than it. Except on the open face of a thick
        // mass of sand: there a grain is left to slide off the face below instead, so a mass sliding
        // down the glass sheds its face rather than riding down whole like a rigid block. (The
        // stream is only two grains wide, so this never frays it.)
        if (!inNeck) {
          const openA = grid[index + acrossAOffset] === EMPTY;
          const openB = grid[index + acrossBOffset] === EMPTY;
          const onFace =
            (openA && grid[index + acrossBOffset] >= 0 && grid[index + 2 * acrossBOffset] >= 0) ||
            (openB && grid[index + acrossAOffset] >= 0 && grid[index + 2 * acrossAOffset] >= 0);
          if (onFace) {
            continue;
          }
        }
        speed[grain] = 1;
      } else {
        // Falling freely: cover as many clear cells as its speed allows, and speed up.
        for (let cells = speed[grain] | 0; cells > 1 && grid[target + downOffset] === EMPTY; cells--) {
          target += downOffset;
        }
        speed[grain] = Math.min(maxSpeed, speed[grain] + acceleration);
      }
      grid[index] = EMPTY;
      vacatedAt[index] = step;
      grid[target] = grain;
      cellOf[grain] = target;
      movedAt[grain] = step;
    }

    // Then the grains that couldn't fall, or were left on a face, slide down either side if there's room.
    for (let index = start; index >= first && index <= last; index += columnStep) {
      const grain = grid[index];
      if (grain < 0 || movedAt[grain] === step) {
        continue;
      }
      speed[grain] = 1;
      let aOffset = sideAOffset;
      let bOffset = sideBOffset;
      let aOpen = grid[index + aOffset] === EMPTY;
      let bOpen = grid[index + bOffset] === EMPTY;
      let rollingOff = false;
      if (!aOpen && !bOpen) {
        // At the edge of a pile, roll off sideways if the slope falls away steeply enough.
        aOffset = acrossAOffset;
        bOffset = acrossBOffset;
        aOpen = grid[index + aOffset] === EMPTY;
        bOpen = grid[index + bOffset] === EMPTY;
        if (aOpen || bOpen) {
          const rolling = movedAt[grain] === step - 1 && nextRandom(state) < SAND.keepRolling;
          aOpen = aOpen && slopeFallsAway(grid, movedAt, step, index, aOffset, downOffset, rolling);
          bOpen = bOpen && slopeFallsAway(grid, movedAt, step, index, bOffset, downOffset, rolling);
          rollingOff = true;
        }
      }
      let way: number;
      if (aOpen && (!bOpen || nextRandom(state) < 0.5)) {
        way = aOffset;
      } else if (bOpen) {
        way = bOffset;
      } else if (grid[index + downOffset] === EMPTY) {
        // A grain left on a face with nowhere to slide follows its column down after all.
        way = downOffset;
      } else {
        continue;
      }
      let target = index + way;
      if (rollingOff && way !== downOffset) {
        // Run on across the sand below for a few cells, and drop into the first gap: sand pours
        // down a slope in a stream, so a too-steep face slumps in a moment, not grain by grain.
        for (let cells = 1; cells < SAND.rollCells && grid[target + downOffset] !== EMPTY && grid[target + way] === EMPTY; cells++) {
          target += way;
        }
        if (grid[target + downOffset] === EMPTY) {
          target += downOffset;
        }
      }
      grid[index] = EMPTY;
      vacatedAt[index] = step;
      grid[target] = grain;
      cellOf[grain] = target;
      movedAt[grain] = step;
    }
  }
}

/** Points gravity, given in the glass's own axes. While the phone lies flat it keeps its last direction. */
export function setGravity(state: SandState, x: number, y: number) {
  'worklet';
  const strength = Math.hypot(x, y);
  if (strength >= SAND.minInPlaneGravity) {
    state.gravityX = x / strength;
    state.gravityY = y / strength;
  }
}

/** Advances the sand by `dt` seconds, in fixed steps. */
export function stepSand(state: SandState, dt: number) {
  'worklet';
  state.stepCarry += dt * SAND.stepsPerSecond;
  while (state.stepCarry >= 1) {
    state.stepCarry -= 1;
    runStep(state);
  }
}

/** How many grains are in the bulb gravity pulls away from: the one emptying. */
function grainsInUpperBulb(state: SandState): number {
  'worklet';
  // Cells are numbered row by row, so the lower half of the glass starts at this index.
  const lowerHalf = (state.rows / 2 + 1) * state.stride;
  let upper = 0;
  for (let i = 0; i < state.count; i++) {
    if (state.cellOf[i] < lowerHalf) {
      upper++;
    }
  }
  return state.gravityY > 0 ? upper : state.count - upper;
}

/** True on the frame the upper bulb runs empty; once per pour. */
export function takeRunOut(state: SandState): boolean {
  'worklet';
  // Mid-flip "upper" keeps changing, so only judge it with the glass near upright.
  if (Math.abs(state.gravityY) < HAPTICS.uprightGravity) {
    return false;
  }
  const upper = grainsInUpperBulb(state);
  if (upper > HAPTICS.rearmGrains) {
    state.runOutArmed = true;
  } else if (upper === 0 && state.runOutArmed) {
    state.runOutArmed = false;
    return true;
  }
  return false;
}
