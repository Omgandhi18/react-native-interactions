// The building blocks of the Prism card: metal, security lines, chip, contactless mark, gem logo
// and hologram sticker. Every size is in card units, scaled by `u` (dp per card unit).
import { ClipOp, PaintStyle, Skia, StrokeCap, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkFont, SkPaint } from '@shopify/react-native-skia';

import type { SeededRandom } from '@/shared/seededRandom';
import { colorPaint } from '@/shared/skia';

import { drawTrackedText } from '../text';
import { BACK, CHIP, FRONT, GEM, GUILLOCHE, INK, METAL } from './constants';

const TAU = Math.PI * 2;
/** The gem's inner facet ring, as a fraction of its outer radius. */
const GEM_INNER_SCALE = 0.5;

export function strokePaint(color: string, width: number, alpha?: number): SkPaint {
  const paint = colorPaint(color, alpha);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  paint.setStrokeCap(StrokeCap.Round);
  return paint;
}

/** Dark metal with fine horizontal brush lines. */
export function drawBrushedMetal(canvas: SkCanvas, width: number, height: number, u: number, random: SeededRandom) {
  const metal = Skia.Paint();
  metal.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(0, 0),
      vec(width, height),
      METAL.colors.map((color) => Skia.Color(color)),
      [...METAL.positions],
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), metal);

  const line = strokePaint(METAL.brushColor, METAL.brushWidth * u);
  for (let i = 0; i < METAL.brushLines; i++) {
    line.setAlphaf(random.range(METAL.brushMinAlpha, METAL.brushMaxAlpha));
    const y = random.range(0, height);
    canvas.drawLine(0, y, width, y, line);
  }
}

/** Woven wavy lines across the middle of the card. */
export function drawGuilloche(canvas: SkCanvas, width: number, u: number, paint: SkPaint) {
  for (let line = 0; line < GUILLOCHE.lines; line++) {
    const baseY = (GUILLOCHE.centerY + (line - GUILLOCHE.lines / 2) * GUILLOCHE.spacing) * u;
    const path = Skia.PathBuilder.Make();
    for (let point = 0; point <= GUILLOCHE.points; point++) {
      const t = point / GUILLOCHE.points;
      const y = baseY + GUILLOCHE.amplitude * u * Math.sin(TAU * GUILLOCHE.frequency * t + line * GUILLOCHE.phaseStep);
      if (point === 0) {
        path.moveTo(t * width, y);
      } else {
        path.lineTo(t * width, y);
      }
    }
    canvas.drawPath(path.build(), paint);
  }
}

export function chipRRect(u: number) {
  const { x, y, width, height, radius } = FRONT.chip;
  return Skia.RRectXY(Skia.XYWHRect(x * u, y * u, width * u, height * u), radius * u, radius * u);
}

export function drawChip(canvas: SkCanvas, u: number) {
  const { x, y, width, height, radius } = FRONT.chip;
  const gold = Skia.Paint();
  gold.setAntiAlias(true);
  gold.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(x * u, y * u),
      vec((x + width) * u, (y + height) * u),
      CHIP.colors.map((color) => Skia.Color(color)),
      [...CHIP.positions],
      TileMode.Clamp,
    ),
  );
  canvas.drawRRect(chipRRect(u), gold);

  // The contact pad: an inner outline split into six contacts.
  const lines = strokePaint(CHIP.lineColor, CHIP.lineWidth * u);
  const innerX = (x + CHIP.inset) * u;
  const innerY = (y + CHIP.inset) * u;
  const innerWidth = (width - CHIP.inset * 2) * u;
  const innerHeight = (height - CHIP.inset * 2) * u;
  const innerRadius = radius * u * CHIP.innerRadiusScale;
  canvas.drawRRect(
    Skia.RRectXY(Skia.XYWHRect(innerX, innerY, innerWidth, innerHeight), innerRadius, innerRadius),
    lines,
  );
  const middleX = innerX + innerWidth / 2;
  canvas.drawLine(middleX, innerY, middleX, innerY + innerHeight, lines);
  for (const fraction of [1 / 3, 2 / 3]) {
    const lineY = innerY + innerHeight * fraction;
    canvas.drawLine(x * u, lineY, (x + width) * u, lineY, lines);
  }
}

/** The four-arc contactless mark, opening to the right. */
export function drawContactless(canvas: SkCanvas, u: number) {
  const { x, y, firstRadius, step, arcs, sweep, width } = FRONT.contactless;
  const paint = strokePaint(INK.silver, width * u);
  for (let arc = 0; arc < arcs; arc++) {
    const radius = (firstRadius + arc * step) * u;
    canvas.drawArc(
      Skia.XYWHRect(x * u - radius, y * u - radius, radius * 2, radius * 2),
      -sweep / 2,
      sweep,
      false,
      paint,
    );
  }
}

/** The Prism mark: a hexagonal gem with an inner ring of facets. */
export function drawGem(canvas: SkCanvas, centerX: number, centerY: number, radius: number, paint: SkPaint) {
  const outer = hexagonPoints(centerX, centerY, radius);
  const inner = hexagonPoints(centerX, centerY, radius * GEM_INNER_SCALE);
  for (const ring of [outer, inner]) {
    const path = Skia.PathBuilder.Make();
    ring.forEach((point, index) => (index === 0 ? path.moveTo(point.x, point.y) : path.lineTo(point.x, point.y)));
    canvas.drawPath(path.close().build(), paint);
  }
  outer.forEach((point, index) => canvas.drawLine(point.x, point.y, inner[index].x, inner[index].y, paint));
}

function hexagonPoints(centerX: number, centerY: number, radius: number) {
  return Array.from({ length: GEM.sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * TAU) / GEM.sides;
    return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
}

export function hologramRRect(u: number) {
  const { x, y, width, height, radius } = BACK.hologram;
  return Skia.RRectXY(Skia.XYWHRect(x * u, y * u, width * u, height * u), radius * u, radius * u);
}

/** A silver hologram sticker with concentric rings and a small gem. */
export function drawHologramSticker(canvas: SkCanvas, u: number) {
  const { x, y, width, height, colors, rings, ringColor, ringWidth } = BACK.hologram;
  const rrect = hologramRRect(u);
  const silver = Skia.Paint();
  silver.setAntiAlias(true);
  silver.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(x * u, y * u),
      vec((x + width) * u, (y + height) * u),
      colors.map((color) => Skia.Color(color)),
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawRRect(rrect, silver);

  const centerX = (x + width / 2) * u;
  const centerY = (y + height / 2) * u;
  const ringPaint = strokePaint(ringColor, ringWidth * u);
  canvas.save();
  canvas.clipRRect(rrect, ClipOp.Intersect, true);
  const ringGap = (width * u) / 2 / rings;
  for (let ring = 1; ring <= rings; ring++) {
    canvas.drawCircle(centerX, centerY, ring * ringGap, ringPaint);
  }
  canvas.restore();
  drawGem(canvas, centerX, centerY, (height / 3) * u, strokePaint(INK.embossShadow, ringWidth * u));
}

/** Silver text with a dark copy just below it, so it reads as stamped into the metal. */
export function drawEmbossedText(
  canvas: SkCanvas,
  text: string,
  x: number,
  baseline: number,
  font: SkFont,
  tracking: number,
  u: number,
) {
  drawTrackedText(
    canvas,
    text,
    x + INK.embossOffsetX * u,
    baseline + INK.embossOffsetY * u,
    font,
    colorPaint(INK.embossShadow),
    tracking,
  );
  drawTrackedText(canvas, text, x, baseline, font, colorPaint(INK.silver), tracking);
}
