// Builds the images the Monsoon window draws every frame: the sharp city behind the glass,
// a fogged-up copy of it, and the sprites that make a drop look like water.
// Runs once on the JS thread when the screen opens; everything is generated, no image files.
import type { SkImage } from '@shopify/react-native-skia';

import { DROP_LOOK } from '../constants';
import { createSeededRandom } from '@/shared/seededRandom';
import { drawCity } from './city';
import { SCENE } from './constants';
import { renderToImage, type LightSource } from './drawing';
import { drawFoggedCity } from './fog';
import { drawDropOverlay, drawDropShadow } from './sprites';

export { imageBounds } from './drawing';

export type SceneAssets = {
  clearScene: SkImage;
  foggedScene: SkImage;
  dropOverlay: SkImage;
  dropShadow: SkImage;
};

export function createSceneAssets(width: number, height: number, pixelRatio: number): SceneAssets {
  const random = createSeededRandom(SCENE.seed);

  let lights: LightSource[] = [];
  const clearScene = renderToImage(width, height, pixelRatio * SCENE.clearResolution, (canvas) => {
    lights = drawCity(canvas, width, height, random);
  });
  const foggedScene = renderToImage(width, height, pixelRatio * SCENE.fogResolution, (canvas) =>
    drawFoggedCity(canvas, clearScene, lights, width, height, random),
  );

  const spriteSize = DROP_LOOK.spriteSize;
  return {
    clearScene,
    foggedScene,
    dropOverlay: renderToImage(spriteSize, spriteSize, 1, (canvas) => drawDropOverlay(canvas, spriteSize)),
    dropShadow: renderToImage(spriteSize, spriteSize, 1, (canvas) => drawDropShadow(canvas, spriteSize)),
  };
}
