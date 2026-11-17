// Finding each bird's nearest neighbours without checking every other bird. Space is cut into
// cubes, and each cube is hashed into one of a fixed number of buckets, so the grid never needs
// bounds. Birds are sorted by bucket once a frame; a lookup scans the 27 cubes around a bird.
import { FLOCK, HASH_PRIMES } from './constants';

const BUCKET_MASK = FLOCK.hashBuckets - 1;
const HALF = 0.5;

export type Points = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
};

/** Each bird's nearest neighbours, `size` slots per bird, nearest first. */
export type NeighbourLists = {
  size: number;
  indices: Int32Array;
  /** Squared distances, matching `indices`. */
  distances: Float32Array;
  counts: Uint8Array;
};

export type SpatialHash = {
  /** Where each bucket's birds start in `members`; the last entry is the bird count. */
  start: Int32Array;
  /** Next free slot per bucket while sorting. */
  cursor: Int32Array;
  bucketOf: Int32Array;
  /** Every bird, sorted by bucket. */
  members: Int32Array;
};

export function createSpatialHash(count: number): SpatialHash {
  return {
    start: new Int32Array(FLOCK.hashBuckets + 1),
    cursor: new Int32Array(FLOCK.hashBuckets),
    bucketOf: new Int32Array(count),
    members: new Int32Array(count),
  };
}

export function createNeighbourLists(count: number): NeighbourLists {
  const size = FLOCK.neighbours;
  return {
    size,
    indices: new Int32Array(count * size),
    distances: new Float32Array(count * size),
    counts: new Uint8Array(count),
  };
}

function bucketOfCell(cellX: number, cellY: number, cellZ: number): number {
  'worklet';
  return (
    (Math.imul(cellX, HASH_PRIMES[0]) ^ Math.imul(cellY, HASH_PRIMES[1]) ^ Math.imul(cellZ, HASH_PRIMES[2])) &
    BUCKET_MASK
  );
}

/** Sorts the birds into buckets: a counting sort, so it's linear in birds plus buckets. */
export function buildSpatialHash(hash: SpatialHash, points: Points) {
  'worklet';
  const { start, cursor, bucketOf, members } = hash;
  const { x, y, z, count } = points;
  const cell = FLOCK.cellSize;
  start.fill(0);
  for (let i = 0; i < count; i++) {
    const bucket = bucketOfCell(Math.floor(x[i] / cell), Math.floor(y[i] / cell), Math.floor(z[i] / cell));
    bucketOf[i] = bucket;
    start[bucket + 1]++;
  }
  for (let b = 0; b < FLOCK.hashBuckets; b++) {
    start[b + 1] += start[b];
    cursor[b] = start[b];
  }
  for (let i = 0; i < count; i++) {
    members[cursor[bucketOf[i]]++] = i;
  }
}

/** Offers `other` as one of `bird`'s nearest neighbours, keeping the list sorted nearest first. */
function offer(lists: NeighbourLists, base: number, found: number, other: number, distance: number): number {
  'worklet';
  const { size, indices, distances } = lists;
  if (found === size && distance >= distances[base + size - 1]) {
    return found;
  }
  // Two of the cubes around a bird can share a bucket, so the same bird can turn up twice.
  for (let k = 0; k < found; k++) {
    if (indices[base + k] === other) {
      return found;
    }
  }
  let slot = found < size ? found : size - 1;
  while (slot > 0 && distances[base + slot - 1] > distance) {
    indices[base + slot] = indices[base + slot - 1];
    distances[base + slot] = distances[base + slot - 1];
    slot--;
  }
  indices[base + slot] = other;
  distances[base + slot] = distance;
  return found < size ? found + 1 : found;
}

/** Offers every bird in one bucket as a neighbour. Returns how many slots are now filled. */
function offerBucket(hash: SpatialHash, points: Points, lists: NeighbourLists, bird: number, bucket: number, found: number) {
  'worklet';
  const { start, members } = hash;
  const { x, y, z } = points;
  const px = x[bird];
  const py = y[bird];
  const pz = z[bird];
  for (let m = start[bucket]; m < start[bucket + 1]; m++) {
    const other = members[m];
    if (other !== bird) {
      const ox = x[other] - px;
      const oy = y[other] - py;
      const oz = z[other] - pz;
      found = offer(lists, bird * lists.size, found, other, ox * ox + oy * oy + oz * oz);
    }
  }
  return found;
}

/** For a bird with too few neighbours close by: every cube out to `FLOCK.maxSearchRing` cubes away. */
function searchWider(hash: SpatialHash, points: Points, lists: NeighbourLists, bird: number, found: number) {
  'worklet';
  const cell = FLOCK.cellSize;
  const cellX = Math.floor(points.x[bird] / cell);
  const cellY = Math.floor(points.y[bird] / cell);
  const cellZ = Math.floor(points.z[bird] / cell);
  for (let ring = 1; ring <= FLOCK.maxSearchRing && found < lists.size; ring++) {
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          // Further rings only add their outer shell; the inside was searched already.
          if (ring === 1 || Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) === ring) {
            found = offerBucket(hash, points, lists, bird, bucketOfCell(cellX + dx, cellY + dy, cellZ + dz), found);
          }
        }
      }
    }
  }
  return found;
}

/**
 * Fills in `bird`'s nearest neighbours. It searches the 2×2×2 block of cubes nearest the bird (its
 * own, and the next one toward whichever side of it the bird sits), and only looks wider if
 * that turns up fewer than it needs. This is the hottest loop in the app, so it's written out flat.
 */
export function findNeighbours(hash: SpatialHash, points: Points, lists: NeighbourLists, bird: number) {
  'worklet';
  const { start, members } = hash;
  const { x, y, z } = points;
  const { size, distances } = lists;
  const cell = FLOCK.cellSize;
  const base = bird * size;
  const px = x[bird];
  const py = y[bird];
  const pz = z[bird];
  const unitX = px / cell;
  const unitY = py / cell;
  const unitZ = pz / cell;
  const fromX = Math.floor(unitX - HALF);
  const fromY = Math.floor(unitY - HALF);
  const fromZ = Math.floor(unitZ - HALF);
  let found = 0;
  // Once the list is full, anything further than its last entry can be skipped without a call.
  let furthest = Infinity;

  for (let cellZ = fromZ; cellZ <= fromZ + 1; cellZ++) {
    const hashZ = Math.imul(cellZ, HASH_PRIMES[2]);
    for (let cellY = fromY; cellY <= fromY + 1; cellY++) {
      const hashYZ = hashZ ^ Math.imul(cellY, HASH_PRIMES[1]);
      for (let cellX = fromX; cellX <= fromX + 1; cellX++) {
        const bucket = (hashYZ ^ Math.imul(cellX, HASH_PRIMES[0])) & BUCKET_MASK;
        for (let m = start[bucket]; m < start[bucket + 1]; m++) {
          const other = members[m];
          if (other === bird) {
            continue;
          }
          const ox = x[other] - px;
          const oy = y[other] - py;
          const oz = z[other] - pz;
          const distance = ox * ox + oy * oy + oz * oz;
          if (distance < furthest) {
            found = offer(lists, base, found, other, distance);
            if (found === size) {
              furthest = distances[base + size - 1];
            }
          }
        }
      }
    }
  }

  if (found < size) {
    found = searchWider(hash, points, lists, bird, found);
  }
  lists.counts[bird] = found;
}
