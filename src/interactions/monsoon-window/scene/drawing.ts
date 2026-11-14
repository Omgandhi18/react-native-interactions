// Small drawing helpers shared by the city, the fog and the drop sprites.
import { BlendMode, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import { withAlpha } from '@/shared/skia';

export { colorPaint, imageBounds, renderToImage, withAlpha } from '@/shared/skia';

/** A light in the city. The fog uses these to bloom each light into a soft glow. */
export type LightSource = {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
};

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
