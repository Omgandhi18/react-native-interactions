// Skia helpers shared by every interaction.
import { Skia } from '@shopify/react-native-skia';
import type { SkCanvas, SkColor, SkImage, SkPath, SkRect } from '@shopify/react-native-skia';

import type { SeededRandom } from './seededRandom';

export function imageBounds(image: SkImage): SkRect {
  return Skia.XYWHRect(0, 0, image.width(), image.height());
}

/** Draws into an offscreen CPU surface at `scale` pixels per dp and returns the result as an image. */
export function renderToImage(
  width: number,
  height: number,
  scale: number,
  draw: (canvas: SkCanvas) => void,
): SkImage {
  const surface = Skia.Surface.Make(Math.ceil(width * scale), Math.ceil(height * scale));
  if (!surface) {
    throw new Error('Could not create an offscreen Skia surface');
  }
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  draw(canvas);
  surface.flush();
  return surface.makeImageSnapshot();
}

export function withAlpha(color: string, alpha: number): SkColor {
  const skColor = Skia.Color(color);
  skColor[3] = alpha;
  return skColor;
}

/** The colour `t` of the way from `from` to `to` (0 to 1), opaque. */
export function mixColors(from: string, to: string, t: number): SkColor {
  const a = Skia.Color(from);
  const b = Skia.Color(to);
  return Float32Array.of(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1);
}

/** A solid-colour paint. Without `alpha`, the colour keeps its own alpha (e.g. from an rgba string). */
export function colorPaint(color: string, alpha?: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(alpha === undefined ? Skia.Color(color) : withAlpha(color, alpha));
  return paint;
}

/** A cubic Bézier whose two control points sit this many times higher than its ends peaks at exactly 1. */
const CUBIC_PEAK = 4 / 3;

/** A treeline's shape: its baseline, and its crowns' widths and heights, as fractions of the screen. */
export type TreelineShape = {
  baseline: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
};

/** A row of rounded tree crowns of random widths and heights, filled down to the bottom of the screen. */
export function treelinePath(width: number, height: number, shape: TreelineShape, random: SeededRandom): SkPath {
  const base = shape.baseline * height;
  const path = Skia.PathBuilder.Make();
  path.moveTo(0, height);
  path.lineTo(0, base);
  let x = 0;
  while (x < width) {
    const crownWidth = random.range(shape.minWidth, shape.maxWidth) * width;
    const top = base - random.range(shape.minHeight, shape.maxHeight) * height * CUBIC_PEAK;
    path.cubicTo(x, top, x + crownWidth, top, x + crownWidth, base);
    x += crownWidth;
  }
  path.lineTo(x, height);
  path.close();
  return path.build();
}
