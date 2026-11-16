// Turns a binary STL scan into a small TypeScript module of surface points for Marble Dust.
// Points are spread evenly over the surface (by area), each with the normal of the triangle it
// came from, then turned so the chosen front faces the viewer and scaled to a unit half-height.
//
// Usage: node scripts/scan-to-points.mjs <scan.stl> <out.ts> --front <deg> [--count <n>] [--crop-bottom <fraction>]
//   --front        compass angle (degrees, in the scan's XY plane) the face points along
//   --count        how many points to keep (default 12000)
//   --crop-bottom  drop points in this bottom fraction of the height, e.g. a mounting block
// The scan must have +Z up. Same input and options always give the same output (seeded random).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const STL_HEADER_BYTES = 80;
const STL_TRIANGLE_BYTES = 50;
const INT16_MAX = 32767;
const INT8_MAX = 127;
const SEED = 20261116;
/** Sampling weight of surfaces facing away from the front, next to 1 for surfaces facing it. */
const BACK_WEIGHT = 0.12;
/** Ambient occlusion: neighbourhood radius (fraction of the scan's height) and how many surface samples to test against. */
const OCCLUSION_RADIUS = 0.045;
const OCCLUSION_SAMPLES = 150000;
/** Neighbours must rise at least this steeply above a point's tangent plane to hide it. */
const OCCLUSION_MIN_RISE = 0.15;
const OCCLUSION_FULL_PERCENTILE = 0.97;
/** Even spreading: candidates drawn per kept point, the largest spacing tried (fraction of height), and search steps. */
const EVEN_CANDIDATES_PER_POINT = 8;
const EVEN_MAX_SPACING = 0.1;
const EVEN_SEARCH_STEPS = 14;
const BYTE_MAX = 255;
const USAGE =
  'Usage: node scripts/scan-to-points.mjs <scan.stl> <out.ts> --front <deg> [--count <n>] [--crop-bottom <fraction>]';

/** Mulberry32, the same generator as src/shared/seededRandom.ts. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readTriangles(buffer) {
  const count = buffer.readUInt32LE(STL_HEADER_BYTES);
  if (buffer.length !== STL_HEADER_BYTES + 4 + count * STL_TRIANGLE_BYTES) {
    throw new Error('Not a binary STL (ASCII STL is not supported)');
  }
  // Nine floats per triangle: three corners of x, y, z.
  const corners = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    const offset = STL_HEADER_BYTES + 4 + t * STL_TRIANGLE_BYTES + 12; // skip the stored normal
    for (let k = 0; k < 9; k++) {
      corners[t * 9 + k] = buffer.readFloatLE(offset + k * 4);
    }
  }
  return { count, corners };
}

/** Area and unit normal of each triangle (normals recomputed: stored ones are often missing). */
function triangleGeometry({ count, corners }) {
  const areas = new Float64Array(count);
  const normals = new Float32Array(count * 3);
  for (let t = 0; t < count; t++) {
    const c = t * 9;
    const e1 = [corners[c + 3] - corners[c], corners[c + 4] - corners[c + 1], corners[c + 5] - corners[c + 2]];
    const e2 = [corners[c + 6] - corners[c], corners[c + 7] - corners[c + 1], corners[c + 8] - corners[c + 2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const length = Math.hypot(...cross);
    areas[t] = length / 2;
    if (length > 0) {
      normals.set(cross.map((value) => value / length), t * 3);
    }
  }
  return { areas, normals };
}

function zRange(corners) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 2; i < corners.length; i += 3) {
    min = Math.min(min, corners[i]);
    max = Math.max(max, corners[i]);
  }
  return { min, max };
}

/** Index of the first entry in an ascending array that is >= value. */
function lowerBound(sorted, value) {
  let low = 0;
  let high = sorted.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sorted[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Picks `count` points, weighted by area and by how much each triangle faces the front: the
 * statue only sways, so the back is rarely seen and gets just enough points to fill a blast.
 */
function samplePoints(triangles, geometry, count, cropBelowZ, forward) {
  const { corners } = triangles;
  const cumulative = new Float64Array(geometry.areas.length);
  let total = 0;
  geometry.areas.forEach((area, t) => {
    const lowestZ = Math.min(corners[t * 9 + 2], corners[t * 9 + 5], corners[t * 9 + 8]);
    // With no `forward`, every surface counts the same.
    const weight = forward
      ? BACK_WEIGHT + Math.max(0, geometry.normals[t * 3] * forward[0] + geometry.normals[t * 3 + 1] * forward[1])
      : 1;
    total += lowestZ < cropBelowZ ? 0 : area * weight;
    cumulative[t] = total;
  });

  const random = seededRandom(SEED + count);
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = lowerBound(cumulative, random() * total);
    // Uniform point in a triangle: square-root trick on two random numbers.
    const r1 = Math.sqrt(random());
    const r2 = random();
    const weights = [1 - r1, r1 * (1 - r2), r1 * r2];
    const position = [0, 1, 2].map((axis) =>
      weights.reduce((sum, weight, corner) => sum + weight * corners[t * 9 + corner * 3 + axis], 0),
    );
    points.push({ position, normal: Array.from(geometry.normals.subarray(t * 3, t * 3 + 3)) });
  }
  return points;
}

/** The front direction in the scan's XY plane. */
function frontVector(frontDegrees) {
  const angle = (frontDegrees * Math.PI) / 180;
  return [Math.cos(angle), Math.sin(angle)];
}

/**
 * Evenly spread points (blue noise) instead of random clumps and holes, which read as speckle.
 * Draws many weighted candidates, then keeps each one only if no kept point is within its spacing.
 * Spacing grows where the sampling weight is low, so the front stays denser than the back. The
 * spacing is binary-searched until at least `count` points survive, then the first `count` are kept.
 */
function spreadEvenly(triangles, geometry, count, cropBelowZ, forward, height) {
  const candidates = samplePoints(triangles, geometry, count * EVEN_CANDIDATES_PER_POINT, cropBelowZ, forward);
  const spacingScale = candidates.map(({ normal }) => {
    const facing = normal[0] * forward[0] + normal[1] * forward[1];
    return 1 / Math.sqrt(BACK_WEIGHT + Math.max(0, facing));
  });
  const maxScale = Math.max(...spacingScale);

  const keep = (spacing) => {
    const cell = spacing * maxScale;
    const grid = new Map();
    const kept = [];
    const keyOf = (x, y, z) => `${x},${y},${z}`;
    for (let i = 0; i < candidates.length; i++) {
      const [px, py, pz] = candidates[i].position;
      const reach = spacing * spacingScale[i];
      const [cx, cy, cz] = [px, py, pz].map((value) => Math.floor(value / cell));
      let crowded = false;
      for (let dx = -1; dx <= 1 && !crowded; dx++) {
        for (let dy = -1; dy <= 1 && !crowded; dy++) {
          for (let dz = -1; dz <= 1 && !crowded; dz++) {
            for (const j of grid.get(keyOf(cx + dx, cy + dy, cz + dz)) ?? []) {
              const [qx, qy, qz] = candidates[j].position;
              const limit = (reach + spacing * spacingScale[j]) / 2;
              if ((qx - px) ** 2 + (qy - py) ** 2 + (qz - pz) ** 2 < limit * limit) {
                crowded = true;
                break;
              }
            }
          }
        }
      }
      if (!crowded) {
        kept.push(i);
        const key = keyOf(cx, cy, cz);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
    }
    return kept;
  };

  let low = 0;
  let high = height * EVEN_MAX_SPACING;
  for (let step = 0; step < EVEN_SEARCH_STEPS; step++) {
    const middle = (low + high) / 2;
    if (keep(middle).length >= count) low = middle;
    else high = middle;
  }
  return keep(low)
    .slice(0, count)
    .map((i) => candidates[i]);
}

/**
 * How tucked-in each point is (0 = open, 1 = deep in a crevice): eye sockets, nostrils, the gaps
 * between curls. It's what makes a statue read. For each point, a dense cloud of surface samples is
 * checked within `OCCLUSION_RADIUS`; samples that rise above the point's tangent plane hide it from
 * the light, nearer ones more. Convex surfaces have none, since their neighbours fall away below.
 */
function ambientOcclusion(points, triangles, geometry, cropBelowZ, height) {
  const radius = height * OCCLUSION_RADIUS;
  const dense = samplePoints(triangles, geometry, OCCLUSION_SAMPLES, cropBelowZ, null);
  const cellKey = (x, y, z) => `${Math.floor(x / radius)},${Math.floor(y / radius)},${Math.floor(z / radius)}`;
  const grid = new Map();
  dense.forEach(({ position }) => {
    const key = cellKey(...position);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(position);
  });

  const raw = points.map(({ position: [px, py, pz], normal: [nx, ny, nz] }) => {
    let hidden = 0;
    const [cx, cy, cz] = [px, py, pz].map((value) => Math.floor(value / radius));
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const [qx, qy, qz] of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            const offset = [qx - px, qy - py, qz - pz];
            const distance = Math.hypot(...offset);
            if (distance === 0 || distance > radius) continue;
            const rise = (offset[0] * nx + offset[1] * ny + offset[2] * nz) / distance;
            if (rise > OCCLUSION_MIN_RISE) hidden += rise * (1 - distance / radius);
          }
        }
      }
    }
    return hidden;
  });
  // Scale so the most hidden few percent reach 1.
  const sorted = [...raw].sort((a, b) => a - b);
  const full = sorted[Math.floor(sorted.length * OCCLUSION_FULL_PERCENTILE)] || 1;
  return raw.map((value) => Math.min(1, value / full));
}

/** Scan axes to view axes: x right, y up, z toward the viewer (along `forward`). */
function toViewSpace(points, forward) {
  const right = [-forward[1], forward[0]];
  const turn = ([x, y, z]) => [x * right[0] + y * right[1], z, x * forward[0] + y * forward[1]];
  return points.map(({ position, normal }) => ({ position: turn(position), normal: turn(normal) }));
}

/** Centres the points and scales them so they span -1 to 1 vertically. */
function normalize(points) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  points.forEach(({ position }) =>
    position.forEach((value, axis) => {
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }),
  );
  const centre = min.map((value, axis) => (value + max[axis]) / 2);
  const halfHeight = (max[1] - min[1]) / 2;
  const scaled = points.map(({ position, normal }) => ({
    position: position.map((value, axis) => (value - centre[axis]) / halfHeight),
    normal,
  }));
  const halfWidth = (max[0] - min[0]) / 2 / halfHeight;
  return { points: scaled, halfWidth };
}

function encode(points, occlusion) {
  // Positions as int16 (half-height = 32767 means sub-0.01% steps), normals as int8, occlusion as a byte.
  const positions = new Int16Array(points.length * 3);
  const normals = new Int8Array(points.length * 3);
  points.forEach(({ position, normal }, i) => {
    position.forEach((value, axis) => {
      positions[i * 3 + axis] = Math.round(Math.max(-1, Math.min(1, value)) * INT16_MAX);
    });
    normal.forEach((value, axis) => {
      normals[i * 3 + axis] = Math.round(value * INT8_MAX);
    });
  });
  return {
    positions: Buffer.from(positions.buffer).toString('base64'),
    normals: Buffer.from(normals.buffer).toString('base64'),
    occlusion: Buffer.from(Uint8Array.from(occlusion, (value) => Math.round(value * BYTE_MAX))).toString('base64'),
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      front: { type: 'string' },
      count: { type: 'string', default: '12000' },
      'crop-bottom': { type: 'string', default: '0' },
    },
  });
  const [input, output] = positionals;
  const front = Number(values.front);
  const count = Number(values.count);
  const cropBottom = Number(values['crop-bottom']);
  if (!input || !output || !Number.isFinite(front) || !Number.isInteger(count) || count <= 0 || !(cropBottom >= 0 && cropBottom < 1)) {
    console.error(USAGE);
    process.exit(1);
  }

  const triangles = readTriangles(await readFile(input));
  const geometry = triangleGeometry(triangles);
  const { min, max } = zRange(triangles.corners);
  const forward = frontVector(front);
  const cropBelowZ = min + (max - min) * cropBottom;
  const sampled = spreadEvenly(triangles, geometry, count, cropBelowZ, forward, max - min);
  const occlusion = ambientOcclusion(sampled, triangles, geometry, cropBelowZ, max - min);
  const { points, halfWidth } = normalize(toViewSpace(sampled, forward));
  const { positions, normals, occlusion: occlusionBytes } = encode(points, occlusion);

  const command = `node scripts/scan-to-points.mjs ${path.basename(input)} ${path.relative(process.cwd(), output)} --front ${front} --count ${count} --crop-bottom ${cropBottom}`;
  const source = `// Generated by scripts/scan-to-points.mjs. Do not edit by hand.
// ${command}
//
// Source: a plaster cast of the head of Michelangelo's David (inv. KAS2232), 3D-scanned and
// released into the public domain by SMK, the National Gallery of Denmark: https://open.smk.dk/artwork/image/KAS2232

export const SCAN = {
  count: ${count},
  /** Half the width of the points, in units of half their height. */
  halfWidth: ${halfWidth.toFixed(4)},
  /** Base64 of little-endian int16 x, y, z per point; 32767 is half the scan's height. */
  positions: '${positions}',
  /** Base64 of int8 x, y, z per point: the unit surface normal times 127. */
  normals: '${normals}',
  /** Base64 of one byte per point: how hidden in a crevice it is, 0 (open) to 255 (deep). */
  occlusion: '${occlusionBytes}',
} as const;
`;
  await writeFile(output, source);
  console.log(`Wrote ${count} points to ${output} (${(source.length / 1024).toFixed(0)} KB, half-width ${halfWidth.toFixed(3)}).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
