// What every drawAtlas layer here shares: a strip of sprites, and the per-item arrays drawAtlas
// reads, which are built once on the UI thread and then updated in place each frame.
import { FilterMode, Skia } from '@shopify/react-native-skia';
import type { FilterOptions, SkImage, SkRect, SkRSXform } from '@shopify/react-native-skia';

export type SpriteAtlas = {
  image: SkImage;
  sprites: SkRect[];
};

export type AtlasBuffers = {
  sprites: SkRect[];
  transforms: SkRSXform[];
};

/** Smooth sampling, so sprites that are turned or scaled don't come out jagged. */
export const SMOOTH: FilterOptions = { filter: FilterMode.Linear };

export function createAtlasBuffers(count: number, atlas: SpriteAtlas): AtlasBuffers {
  'worklet';
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];
  for (let i = 0; i < count; i++) {
    sprites.push(atlas.sprites[0]);
    transforms.push(Skia.RSXform(0, 0, 0, 0));
  }
  return { sprites, transforms };
}

/** A strip of `count` cells, each `width` by `height` pixels, left to right. */
export function stripCells(count: number, width: number, height: number): SkRect[] {
  return Array.from({ length: count }, (_, i) => Skia.XYWHRect(i * width, 0, width, height));
}
