// Drawing for Marble Dust: every grain in one Skia drawAtlas call per frame.
//
// drawAtlas copies each grain's transform, sprite rectangle and (optional) colour into native code
// every frame, and colours are the slowest part of that copy. So grains carry no colour: the atlas
// image is a strip of the same dot pre-shaded at a range of brightness levels, and each grain points
// at the level it needs.
import { Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint, SkRect, SkRSXform } from '@shopify/react-native-skia';

import { renderToImage } from '@/shared/skia';

import { GRAIN, LIGHT } from './constants';
import type { DustState } from './simulation';

export type GrainAtlas = {
  image: SkImage;
  /** Where each brightness level's dot sits in the image, darkest (invisible) first. */
  levels: SkRect[];
};

/** The per-grain arrays drawAtlas reads. Built once on the UI thread, then updated in place. */
export type AtlasBuffers = {
  sprites: SkRect[];
  transforms: SkRSXform[];
};

function grainColor(brightness: number, opacity: number): string {
  const { red, green, blue } = GRAIN.color;
  return `rgba(${Math.round(red * brightness)}, ${Math.round(green * brightness)}, ${Math.round(blue * brightness)}, ${opacity})`;
}

/** The strip of dots, one cell per brightness level. Dim dots are also more see-through. */
export function createGrainAtlas(): GrainAtlas {
  const { spriteSize, brightnessLevels } = GRAIN;
  const radius = spriteSize / 2;
  const topLevel = brightnessLevels - 1;
  const image = renderToImage(spriteSize * brightnessLevels, spriteSize, 1, (canvas) => {
    for (let level = 1; level < brightnessLevels; level++) {
      const brightness = Math.pow(level / topLevel, LIGHT.contrast);
      const opacity = Math.min(1, brightness * GRAIN.opacityGain);
      const center = { x: level * spriteSize + radius, y: radius };
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setShader(
        Skia.Shader.MakeRadialGradient(
          center,
          radius,
          [Skia.Color(grainColor(brightness, opacity)), Skia.Color(grainColor(brightness, opacity)), Skia.Color(grainColor(brightness, 0))],
          [0, GRAIN.solidCore, 1],
          TileMode.Clamp,
        ),
      );
      canvas.drawCircle(center.x, center.y, radius, paint);
    }
  });
  const levels = Array.from({ length: brightnessLevels }, (_, level) =>
    Skia.XYWHRect(level * spriteSize, 0, spriteSize, spriteSize),
  );
  return { image, levels };
}

export function createAtlasBuffers(count: number, atlas: GrainAtlas): AtlasBuffers {
  'worklet';
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];
  for (let i = 0; i < count; i++) {
    sprites.push(atlas.levels[0]);
    transforms.push(Skia.RSXform(0, 0, 0, 0));
  }
  return { sprites, transforms };
}

export function drawDust(canvas: SkCanvas, state: DustState, atlas: GrainAtlas, buffers: AtlasBuffers, paint: SkPaint) {
  'worklet';
  const { screenX, screenY, size, brightness } = state;
  const { sprites, transforms } = buffers;
  const { levels } = atlas;
  const topLevel = GRAIN.brightnessLevels - 1;
  for (let i = 0; i < state.count; i++) {
    const level = (brightness[i] * topLevel + 0.5) | 0;
    sprites[i] = levels[level];
    // Scale the dot to the grain's size and centre it there; hidden grains shrink to nothing.
    const diameter = level === 0 ? 0 : size[i];
    transforms[i].set(diameter / GRAIN.spriteSize, 0, screenX[i] - diameter / 2, screenY[i] - diameter / 2);
  }
  canvas.drawAtlas(atlas.image, sprites, transforms, paint);
}
