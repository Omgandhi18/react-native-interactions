// The fogged-up glass: the sharp city diffused into a milky blur, with every light
// blooming into a soft disc the way light scatters through condensation.
import { BlendMode, BlurStyle, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage } from '@shopify/react-native-skia';

import type { SeededRandom } from '@/shared/seededRandom';
import { FOG_LOOK } from './constants';
import { colorPaint, imageBounds, type LightSource } from './drawing';

export function drawFoggedCity(
  canvas: SkCanvas,
  clearCity: SkImage,
  lights: readonly LightSource[],
  width: number,
  height: number,
  random: SeededRandom,
) {
  const screen = Skia.XYWHRect(0, 0, width, height);

  const diffused = Skia.Paint();
  diffused.setImageFilter(Skia.ImageFilter.MakeBlur(FOG_LOOK.blur, FOG_LOOK.blur, TileMode.Clamp, null));
  diffused.setColorFilter(Skia.ColorFilter.MakeMatrix([...FOG_LOOK.colorMatrix]));
  canvas.drawImageRect(clearCity, imageBounds(clearCity), screen, diffused);

  drawBloom(canvas, lights);
  canvas.drawRect(screen, colorPaint(FOG_LOOK.veilColor, FOG_LOOK.veilAlpha));
  drawGrain(canvas, width, height, random);
}

function drawBloom(canvas: SkCanvas, lights: readonly LightSource[]) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setBlendMode(BlendMode.Screen);

  for (const light of lights) {
    const radius = Math.min(
      FOG_LOOK.bloomMaxRadius,
      Math.max(FOG_LOOK.bloomMinRadius, light.radius * FOG_LOOK.bloomScale),
    );
    paint.setColor(Skia.Color(light.color));
    paint.setAlphaf(light.intensity * FOG_LOOK.bloomAlpha);
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, radius * FOG_LOOK.bloomSoftness, true));
    canvas.drawCircle(light.x, light.y, radius, paint);
  }
}

function drawGrain(canvas: SkCanvas, width: number, height: number, random: SeededRandom) {
  const grain = colorPaint(FOG_LOOK.grainColor);
  for (let i = 0; i < FOG_LOOK.grainCount; i++) {
    grain.setAlphaf(random.range(FOG_LOOK.grainMinAlpha, FOG_LOOK.grainMaxAlpha));
    canvas.drawCircle(
      random.range(0, width),
      random.range(0, height),
      random.range(FOG_LOOK.grainMinRadius, FOG_LOOK.grainMaxRadius),
      grain,
    );
  }
}
