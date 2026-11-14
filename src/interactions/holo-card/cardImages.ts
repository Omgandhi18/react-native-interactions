import type { SkCanvas, SkImage } from '@shopify/react-native-skia';

import { renderToImage } from '@/shared/skia';

import type { CardDesign, CardFace, FaceDrawer } from './designs/types';

export type FaceImages = { art: SkImage; foil: SkImage };
export type CardImages = { front: FaceImages; back: FaceImages };

/**
 * Renders each face's artwork and foil mask once, at screen resolution.
 * The back is drawn mirrored: when the card turns 180° in 3D, the mirror cancels out and it reads correctly.
 */
export function renderCardImages(
  design: CardDesign,
  width: number,
  height: number,
  pixelRatio: number,
): CardImages {
  return {
    front: renderFace(design.front, width, height, pixelRatio, false),
    back: renderFace(design.back, width, height, pixelRatio, true),
  };
}

function renderFace(face: CardFace, width: number, height: number, scale: number, mirrored: boolean): FaceImages {
  const withMirror = (draw: FaceDrawer) => (canvas: SkCanvas) => {
    if (mirrored) {
      canvas.translate(width, 0);
      canvas.scale(-1, 1);
    }
    draw(canvas, width, height);
  };
  return {
    art: renderToImage(width, height, scale, withMirror(face.drawArt)),
    foil: renderToImage(width, height, scale, withMirror(face.drawFoil)),
  };
}
