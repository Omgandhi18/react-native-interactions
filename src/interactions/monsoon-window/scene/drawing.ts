// Small drawing helpers shared by the city, the fog and the drop sprites.
import { BlendMode, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkColor, SkImage, SkRect } from '@shopify/react-native-skia';

/** A light in the city. The fog uses these to bloom each light into a soft glow. */
export type LightSource = {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
};

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
    throw new Error('Monsoon window: could not create an offscreen surface');
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

/** A soft round halo of light that fades to nothing at `radius`. */
export function drawGlow(canvas: SkCanvas, x: number, y: number, radius: number, color: string, alpha: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setBlendMode(BlendMode.Screen);
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(x, y),
      radius,
      [withAlpha(color, alpha), withAlpha(color, 0)],
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawCircle(x, y, radius, paint);
}

/** A light's reflection on wet asphalt: a streak running down from the light's base. */
export function drawReflection(
  canvas: SkCanvas,
  x: number,
  top: number,
  width: number,
  length: number,
  color: string,
  alpha: number,
) {
  const paint = Skia.Paint();
  paint.setBlendMode(BlendMode.Screen);
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(x, top),
      vec(x, top + length),
      [withAlpha(color, alpha), withAlpha(color, 0)],
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(Skia.XYWHRect(x - width / 2, top, width, length), paint);
}
