// The front of the Prism card: brand, chip, contactless mark, security lines, gem and name.
import { Skia } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import { createSeededRandom } from '@/shared/seededRandom';
import { colorPaint } from '@/shared/skia';

import { cardFont, drawTrackedText } from '../text';
import { FOIL_MASK, FRONT, GEM, GUILLOCHE, INK, SEED, TEXT, UNITS_WIDE } from './constants';
import {
  chipRRect,
  drawBrushedMetal,
  drawChip,
  drawContactless,
  drawEmbossedText,
  drawGem,
  drawGuilloche,
  strokePaint,
} from './parts';

const FOIL_WHITE = '#FFFFFF';
const FOIL_BLACK = '#000000';

export function drawFrontArt(canvas: SkCanvas, width: number, height: number) {
  const u = width / UNITS_WIDE;
  drawBrushedMetal(canvas, width, height, u, createSeededRandom(SEED));
  drawGuilloche(canvas, width, u, strokePaint(GUILLOCHE.artColor, GUILLOCHE.artWidth * u));

  const { brand, edition, holder, gem } = FRONT;
  drawTrackedText(
    canvas,
    TEXT.brand,
    brand.x * u,
    brand.baseline * u,
    cardFont('sansBold', brand.size * u),
    colorPaint(INK.silver),
    brand.tracking * u,
  );
  drawTrackedText(
    canvas,
    TEXT.edition,
    edition.x * u,
    edition.baseline * u,
    cardFont('sans', edition.size * u),
    colorPaint(INK.muted),
    edition.tracking * u,
  );
  drawChip(canvas, u);
  drawContactless(canvas, u);
  drawGem(canvas, gem.x * u, gem.y * u, gem.radius * u, strokePaint(GEM.color, GEM.width * u));
  drawEmbossedText(canvas, TEXT.holder, holder.x * u, holder.baseline * u, cardFont('sans', holder.size * u), holder.tracking * u, u);
}

/** Faint foil over the whole metal, strong on the security lines and the gem, none on the chip. */
export function drawFrontFoil(canvas: SkCanvas, width: number, height: number) {
  const u = width / UNITS_WIDE;
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), colorPaint(FOIL_WHITE, FOIL_MASK.frontBase));
  drawGuilloche(canvas, width, u, strokePaint(FOIL_WHITE, GUILLOCHE.foilWidth * u, FOIL_MASK.full));

  const { brand, gem } = FRONT;
  drawTrackedText(
    canvas,
    TEXT.brand,
    brand.x * u,
    brand.baseline * u,
    cardFont('sansBold', brand.size * u),
    colorPaint(FOIL_WHITE, FOIL_MASK.wordmark),
    brand.tracking * u,
  );
  drawGem(canvas, gem.x * u, gem.y * u, gem.radius * u, strokePaint(FOIL_WHITE, GEM.foilWidth * u, FOIL_MASK.full));
  canvas.drawRRect(chipRRect(u), colorPaint(FOIL_BLACK));
}
