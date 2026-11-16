import { SCAN } from './scan.generated';

const INT16_MAX = 32767;
const INT8_MAX = 127;
const BYTE_MAX = 255;

export type ScanPoints = {
  count: number;
  /** Half the statue's width, in statue units (its height runs from -1 to 1). */
  halfWidth: number;
  /** x, y, z per point, in statue units: x right, y up, z toward the viewer. */
  positions: Float32Array;
  /** Unit surface normal per point, x, y, z. */
  normals: Float32Array;
  /** How hidden in a crevice each point is, 0 (open) to 1 (deep). */
  occlusion: Float32Array;
};

function decodeBase64(text: string): ArrayBuffer {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Unpacks the generated scan. The packed ints are little-endian, like every phone CPU. */
export function loadScan(): ScanPoints {
  return {
    count: SCAN.count,
    halfWidth: SCAN.halfWidth,
    positions: Float32Array.from(new Int16Array(decodeBase64(SCAN.positions)), (value) => value / INT16_MAX),
    normals: Float32Array.from(new Int8Array(decodeBase64(SCAN.normals)), (value) => value / INT8_MAX),
    occlusion: Float32Array.from(new Uint8Array(decodeBase64(SCAN.occlusion)), (value) => value / BYTE_MAX),
  };
}
