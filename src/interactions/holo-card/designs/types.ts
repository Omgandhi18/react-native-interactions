import type { SkCanvas } from '@shopify/react-native-skia';

/** How strongly a face's foil reacts. Fed straight into the foil shader's uniforms. */
export type FoilStyle = {
  /** Foil strength away from the bright band, 0–1. */
  sheen: number;
  /** Width of the bright band, as a fraction of the card's diagonal. */
  bandWidth: number;
  /** How many rainbows fit across the card. */
  hueSpread: number;
  /** Strength of the glitter sparkles, 0–1. */
  glitter: number;
  /** Strength of the moving glare, 0–1. */
  glare: number;
};

/** Draws into a canvas that is `width` × `height` dp, with (0, 0) at the card's top-left corner. */
export type FaceDrawer = (canvas: SkCanvas, width: number, height: number) => void;

export type CardFace = {
  /** The printed artwork. */
  drawArt: FaceDrawer;
  /** The foil mask: white where the card is holographic, black where it isn't. */
  drawFoil: FaceDrawer;
  foil: FoilStyle;
};

export type CardDesign = {
  front: CardFace;
  back: CardFace;
};
