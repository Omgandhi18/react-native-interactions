// The hourglass's shape and size, worked out once from the screen size. Glass coordinates are in dp
// with the origin at the neck, x right and y down while the glass stands the way it started.
import { FLIP, FRAME, GLASS, SAND } from './constants';

const SHAPE_SAMPLES = 200;

export type GlassLayout = {
  /** Where the neck sits on screen. */
  centerX: number;
  centerY: number;
  /** One bulb's height (neck to cap), its widest half-width, and the neck's half-width. */
  bulbHeight: number;
  bulbHalfWidth: number;
  neckHalfWidth: number;
  /** Side of one sand cell. The sand's grid is `columns` × `rows` cells, both bulbs together. */
  cell: number;
  columns: number;
  rows: number;
  /** Half the size of the whole hourglass, frame included, and of the room it has to turn in. */
  frameHalfWidth: number;
  frameHalfHeight: number;
  roomHalfWidth: number;
  roomHalfHeight: number;
};

/**
 * How wide a bulb is, from 0 at the neck to 1 at its widest, for `u` from 0 (neck) to 1 (cap).
 * It never widens faster than the sand's 45° slope, so the upper bulb always runs dry.
 */
function bulbShape(u: number): number {
  if (u <= GLASS.widestAt) {
    return Math.sin((Math.PI / 2) * (u / GLASS.widestAt));
  }
  const pastWidest = (u - GLASS.widestAt) / (1 - GLASS.widestAt);
  return 1 - GLASS.capPinch * pastWidest * pastWidest;
}

function meanBulbShape(): number {
  let sum = 0;
  for (let i = 0; i < SHAPE_SAMPLES; i++) {
    sum += bulbShape((i + 0.5) / SHAPE_SAMPLES);
  }
  return sum / SHAPE_SAMPLES;
}

/** The glass's inner half-width at a distance `y` above or below the middle of the neck. */
export function glassHalfWidth(layout: GlassLayout, y: number): number {
  const u = Math.max(0, Math.min(1, (Math.abs(y) / layout.bulbHeight - GLASS.throat) / (1 - GLASS.throat)));
  return layout.neckHalfWidth + (layout.bulbHalfWidth - layout.neckHalfWidth) * bulbShape(u);
}

export function createGlassLayout(width: number, height: number): GlassLayout {
  // The frame's half-size in bulb heights: a bulb plus a cap each way, and out to the caps' edges.
  const frameHalfHeight = 1 + FRAME.capGap + FRAME.capHeight;
  const frameHalfWidth = GLASS.bulbWidth + FRAME.postGap + FRAME.postWidth + FRAME.capOverhang;
  const fittedBulbHeight = Math.min(
    (height * GLASS.maxHeightFraction) / 2 / frameHalfHeight,
    (width * GLASS.maxWidthFraction) / 2 / frameHalfWidth,
  );
  const bulbHalfWidth = fittedBulbHeight * GLASS.bulbWidth;

  // Size a cell so the grains fill the chosen share of one bulb, then round the bulb to whole cells.
  const bulbArea = 2 * bulbHalfWidth * fittedBulbHeight * meanBulbShape();
  const cell = Math.sqrt((bulbArea * SAND.fillFraction) / SAND.grains);
  const rows = 2 * Math.ceil(fittedBulbHeight / cell);
  const columns = 2 * Math.ceil(bulbHalfWidth / cell);
  const bulbHeight = (rows / 2) * cell;

  return {
    centerX: width / 2,
    centerY: height * GLASS.centerY,
    bulbHeight,
    bulbHalfWidth,
    neckHalfWidth: (GLASS.neckCells / 2) * cell,
    cell,
    columns,
    rows,
    frameHalfWidth: frameHalfWidth * bulbHeight,
    frameHalfHeight: frameHalfHeight * bulbHeight,
    roomHalfWidth: (width * FLIP.roomWidthFraction) / 2,
    roomHalfHeight: (height * FLIP.roomHeightFraction) / 2,
  };
}

/** How much to shrink the hourglass at a given turn so it stays on screen while it flips. */
export function fitScale(layout: GlassLayout, angle: number): number {
  'worklet';
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfWidth = cos * layout.frameHalfWidth + sin * layout.frameHalfHeight;
  const halfHeight = sin * layout.frameHalfWidth + cos * layout.frameHalfHeight;
  return Math.min(1, layout.roomHalfWidth / halfWidth, layout.roomHalfHeight / halfHeight);
}
