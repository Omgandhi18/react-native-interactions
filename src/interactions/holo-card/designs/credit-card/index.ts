import type { CardDesign } from '../types';
import { drawBackArt, drawBackFoil } from './back';
import { FOIL_STYLE } from './constants';
import { drawFrontArt, drawFrontFoil } from './front';

/** Prism: an original metal credit card with holographic security lines and a hologram sticker. */
export const prismCardDesign: CardDesign = {
  front: { drawArt: drawFrontArt, drawFoil: drawFrontFoil, foil: FOIL_STYLE.front },
  back: { drawArt: drawBackArt, drawFoil: drawBackFoil, foil: FOIL_STYLE.back },
};
