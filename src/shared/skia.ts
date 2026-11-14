// Skia helpers shared by every interaction.
import { Skia } from '@shopify/react-native-skia';
import type { SkCanvas, SkColor, SkImage, SkRect } from '@shopify/react-native-skia';

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

/** A solid-colour paint. Without `alpha`, the colour keeps its own alpha (e.g. from an rgba string). */
export function colorPaint(color: string, alpha?: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(alpha === undefined ? Skia.Color(color) : withAlpha(color, alpha));
  return paint;
}
