// The back of the Prism card: magnetic stripe, stacked number, expiry, CVV, signature strip and
// a hologram sticker. It also says plainly that it's a design study, not a real card.
import { ClipOp, Skia } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import { createSeededRandom } from '@/shared/seededRandom';
import { colorPaint } from '@/shared/skia';

import { cardFont, drawTrackedText } from '../text';
import { BACK, FOIL_MASK, GEM, INK, SEED, TEXT, UNITS_WIDE } from './constants';
import {
  drawBrushedMetal,
  drawEmbossedText,
  drawGem,
  drawHologramSticker,
  hologramRRect,
  strokePaint,
} from './parts';

const FOIL_WHITE = '#FFFFFF';
const FOIL_BLACK = '#000000';
/** A different seed from the front, so the brush lines don't line up through the card. */
const BACK_SEED_OFFSET = 1;

export function drawBackArt(canvas: SkCanvas, width: number, height: number) {
  const u = width / UNITS_WIDE;
  drawBrushedMetal(canvas, width, height, u, createSeededRandom(SEED + BACK_SEED_OFFSET));

  const { stripe, number, label, value, expiry, cvv, holder, disclaimer, gem } = BACK;
  canvas.drawRect(Skia.XYWHRect(0, stripe.y * u, width, stripe.height * u), colorPaint(stripe.color));

  const numberFont = cardFont('mono', number.size * u);
  TEXT.numberGroups.forEach((group, index) => {
    const baseline = (number.firstBaseline + index * number.lineGap) * u;
    drawEmbossedText(canvas, group, number.x * u, baseline, numberFont, number.tracking * u, u);
  });

  const labelFont = cardFont('sans', label.size * u);
  const valueFont = cardFont('mono', value.size * u);
  const muted = colorPaint(INK.muted);
  for (const [field, labelText, valueText] of [
    [expiry, TEXT.validLabel, TEXT.expiry],
    [cvv, TEXT.cvvLabel, TEXT.cvv],
  ] as const) {
    drawTrackedText(canvas, labelText, field.x * u, field.labelBaseline * u, labelFont, muted, label.tracking * u);
    drawEmbossedText(canvas, valueText, field.x * u, field.valueBaseline * u, valueFont, value.tracking * u, u);
  }

  drawEmbossedText(canvas, TEXT.holder, holder.x * u, holder.baseline * u, cardFont('sans', holder.size * u), holder.tracking * u, u);
  drawSignatureStrip(canvas, u);
  drawHologramSticker(canvas, u);
  drawTrackedText(
    canvas,
    TEXT.disclaimer,
    disclaimer.x * u,
    disclaimer.baseline * u,
    cardFont('sans', disclaimer.size * u),
    muted,
    disclaimer.tracking * u,
  );
  drawGem(canvas, gem.x * u, gem.y * u, gem.radius * u, strokePaint(GEM.color, GEM.width * u));
}

/** Faint foil over the metal, stronger on the number, full on the sticker and gem; none on the stripe or strip. */
export function drawBackFoil(canvas: SkCanvas, width: number, height: number) {
  const u = width / UNITS_WIDE;
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), colorPaint(FOIL_WHITE, FOIL_MASK.backBase));

  const { stripe, number, gem } = BACK;
  const black = colorPaint(FOIL_BLACK);
  canvas.drawRect(Skia.XYWHRect(0, stripe.y * u, width, stripe.height * u), black);
  canvas.drawRRect(signatureRRect(u), black);

  const numberFont = cardFont('mono', number.size * u);
  const numberFoil = colorPaint(FOIL_WHITE, FOIL_MASK.numbers);
  TEXT.numberGroups.forEach((group, index) => {
    const baseline = (number.firstBaseline + index * number.lineGap) * u;
    drawTrackedText(canvas, group, number.x * u, baseline, numberFont, numberFoil, number.tracking * u);
  });

  canvas.drawRRect(hologramRRect(u), colorPaint(FOIL_WHITE, FOIL_MASK.full));
  drawGem(canvas, gem.x * u, gem.y * u, gem.radius * u, strokePaint(FOIL_WHITE, GEM.foilWidth * u, FOIL_MASK.full));
}

function signatureRRect(u: number) {
  const { x, y, width, height, radius } = BACK.signature;
  return Skia.RRectXY(Skia.XYWHRect(x * u, y * u, width * u, height * u), radius * u, radius * u);
}

/** A light paper strip with fine diagonal hatching and a handwritten-style signature. */
function drawSignatureStrip(canvas: SkCanvas, u: number) {
  const { x, y, width, height, color, hatchColor, hatchGap, hatchWidth, inkColor, textX, baseline, size } = BACK.signature;
  const rrect = signatureRRect(u);
  canvas.drawRRect(rrect, colorPaint(color));

  canvas.save();
  canvas.clipRRect(rrect, ClipOp.Intersect, true);
  const hatch = strokePaint(hatchColor, hatchWidth * u);
  for (let offset = -height; offset < width; offset += hatchGap) {
    canvas.drawLine((x + offset) * u, (y + height) * u, (x + offset + height) * u, y * u, hatch);
  }
  canvas.restore();

  canvas.drawText(TEXT.signature, textX * u, baseline * u, colorPaint(inkColor), cardFont('serifItalic', size * u));
}
