// Drawing for Hourglass. The glass and its wooden frame are recorded once as pictures. The sand is
// one drawAtlas call a frame: every grain points at a sprite in a small strip, either a round grain
// in one of a few tones, or a streak for a grain falling fast enough to blur. Colours are baked into
// the strip because per-grain colours are the slowest thing drawAtlas copies into native code.
import { BlurStyle, createPicture, PaintStyle, Skia, StrokeCap, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint, SkPath, SkPicture, SkRect, SkRSXform } from '@shopify/react-native-skia';

import { renderToImage, withAlpha } from '@/shared/skia';

import { FRAME, GLASS, LOOK, SAND, SPRITE } from './constants';
import { fitScale, glassHalfWidth } from './glass';
import type { GlassLayout } from './glass';
import type { SandState } from './simulation';

const DEGREES_PER_RADIAN = 180 / Math.PI;

export type SandAtlas = {
  image: SkImage;
  /** A round grain per sand tone. */
  grains: SkRect[];
  /** Streaks, shortest first, lying along +x with the grain itself at the right-hand end. */
  streaks: SkRect[];
  /** Where that grain sits along each streak, in strip pixels from its left end. */
  streakHeads: number[];
};

/** The per-grain arrays drawAtlas reads. Built once on the UI thread, then updated in place. */
export type AtlasBuffers = {
  sprites: SkRect[];
  transforms: SkRSXform[];
};

export type GlassArt = {
  /** The glass itself, drawn behind the sand. */
  back: SkPicture;
  /** Reflections, the outline and the wooden frame, drawn over it. */
  front: SkPicture;
};

export type RenderKit = {
  layout: GlassLayout;
  atlas: SandAtlas;
  glass: GlassArt;
  paint: SkPaint;
};

function softPaint(): SkPaint {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  return paint;
}

function createSandAtlas(): SandAtlas {
  const { size, solidCore, shortestStreak, streakCount, streakThickness } = SPRITE;
  const radius = size / 2;
  const grains = SAND.tones.map((_, i) => Skia.XYWHRect(i * size, 0, size, size));
  const streaks: SkRect[] = [];
  let left = SAND.tones.length * size;
  for (let i = 0; i < streakCount; i++) {
    const length = (shortestStreak + i) * size;
    streaks.push(Skia.XYWHRect(left, 0, length, size));
    left += length;
  }

  const image = renderToImage(left, size, 1, (canvas) => {
    SAND.tones.forEach((tone, i) => {
      const center = vec(i * size + radius, radius);
      const paint = softPaint();
      paint.setShader(
        Skia.Shader.MakeRadialGradient(
          center,
          radius,
          [Skia.Color(tone), Skia.Color(tone), withAlpha(tone, 0)],
          [0, solidCore, 1],
          TileMode.Clamp,
        ),
      );
      canvas.drawCircle(center.x, center.y, radius, paint);
    });
    streaks.forEach((rect) => {
      // Fades in from the tail to the grain at the head.
      const paint = softPaint();
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(size * streakThickness);
      paint.setStrokeCap(StrokeCap.Round);
      paint.setShader(
        Skia.Shader.MakeLinearGradient(
          vec(rect.x, radius),
          vec(rect.x + rect.width, radius),
          [withAlpha(SAND.streakColor, 0), Skia.Color(SAND.streakColor)],
          null,
          TileMode.Clamp,
        ),
      );
      canvas.drawLine(rect.x + radius, radius, rect.x + rect.width - radius, radius, paint);
    });
  });

  return { image, grains, streaks, streakHeads: streaks.map((rect) => rect.width - radius) };
}

/**
 * A line down one side of the glass, `inset` times its half-width (plus `outset` dp) out from the
 * centre line; negative for the left side.
 */
function glassSide(layout: GlassLayout, inset: number, outset: number, fromY: number, toY: number): SkPath {
  const path = Skia.PathBuilder.Make();
  const segments = GLASS.outlineSegments * 2;
  for (let i = 0; i <= segments; i++) {
    const y = fromY + ((toY - fromY) * i) / segments;
    const x = (glassHalfWidth(layout, y) + outset) * inset;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  return path.build();
}

/** The glass's outline, just outside the sand cells so a grain's dot never pokes through it. */
function glassOutline(layout: GlassLayout): SkPath {
  const { bulbHeight, cell } = layout;
  const overhang = cell * (SAND.grainSize / 2 + SAND.jitter - 1 / 2);
  const right = glassSide(layout, 1, overhang, -bulbHeight, bulbHeight);
  const left = glassSide(layout, -1, overhang, bulbHeight, -bulbHeight);
  return Skia.PathBuilder.Make().addPath(right).addPath(left, undefined, true).close().build();
}

/** A soft vertical reflection in each bulb, between the given fractions of the bulb's height. */
function drawReflection(canvas: SkCanvas, layout: GlassLayout, inset: number, from: number, to: number, width: number, alpha: number) {
  const { bulbHeight, bulbHalfWidth } = layout;
  const paint = softPaint();
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeWidth(bulbHalfWidth * width);
  paint.setColor(withAlpha(LOOK.glassColor, alpha));
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, LOOK.highlightBlur, true));
  canvas.drawPath(glassSide(layout, inset, 0, -bulbHeight * to, -bulbHeight * from), paint);
  canvas.drawPath(glassSide(layout, inset, 0, bulbHeight * from, bulbHeight * to), paint);
}

function woodPaint(from: { x: number; y: number }, to: { x: number; y: number }): SkPaint {
  const paint = softPaint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      from,
      to,
      FRAME.woodColors.map((color) => Skia.Color(color)),
      [...FRAME.woodPositions],
      TileMode.Clamp,
    ),
  );
  return paint;
}

function drawFrame(canvas: SkCanvas, layout: GlassLayout) {
  const { bulbHeight, bulbHalfWidth } = layout;
  const capInner = bulbHeight * (1 + FRAME.capGap);
  const capOuter = capInner + bulbHeight * FRAME.capHeight;
  const postLeft = bulbHalfWidth + bulbHeight * FRAME.postGap;
  const postWidth = bulbHeight * FRAME.postWidth;
  const capHalfWidth = postLeft + postWidth + bulbHeight * FRAME.capOverhang;
  const cornerRadius = bulbHeight * FRAME.capCornerRadius;

  for (const side of [-1, 1]) {
    const x = side > 0 ? postLeft : -postLeft - postWidth;
    canvas.drawRect(Skia.XYWHRect(x, -capInner, postWidth, capInner * 2), woodPaint(vec(x, 0), vec(x + postWidth, 0)));
  }

  const edge = softPaint();
  edge.setStyle(PaintStyle.Stroke);
  edge.setStrokeWidth(LOOK.capEdgeWidth);
  edge.setColor(withAlpha(LOOK.capEdgeColor, LOOK.capEdgeAlpha));
  for (const side of [-1, 1]) {
    const top = side > 0 ? capInner : -capOuter;
    const cap = Skia.RRectXY(Skia.XYWHRect(-capHalfWidth, top, capHalfWidth * 2, capOuter - capInner), cornerRadius, cornerRadius);
    canvas.drawRRect(cap, woodPaint(vec(0, top), vec(0, top + capOuter - capInner)));
    const edgeY = side * capInner;
    canvas.drawLine(-capHalfWidth + cornerRadius, edgeY, capHalfWidth - cornerRadius, edgeY, edge);
  }
}

function createGlassArt(layout: GlassLayout): GlassArt {
  const { bulbHalfWidth } = layout;
  const outline = glassOutline(layout);
  const bounds = Skia.XYWHRect(-layout.frameHalfWidth, -layout.frameHalfHeight, layout.frameHalfWidth * 2, layout.frameHalfHeight * 2);

  const back = createPicture((canvas) => {
    const glass = softPaint();
    glass.setShader(
      Skia.Shader.MakeLinearGradient(
        vec(-bulbHalfWidth, 0),
        vec(bulbHalfWidth, 0),
        LOOK.glassAlphas.map((alpha) => withAlpha(LOOK.glassColor, alpha)),
        [...LOOK.glassPositions],
        TileMode.Clamp,
      ),
    );
    canvas.drawPath(outline, glass);
  }, bounds);

  const front = createPicture((canvas) => {
    drawReflection(canvas, layout, -LOOK.highlightInset, LOOK.highlightFrom, LOOK.highlightTo, LOOK.highlightWidth, LOOK.highlightAlpha);
    drawReflection(canvas, layout, LOOK.glintInset, LOOK.glintFrom, LOOK.glintTo, LOOK.glintWidth, LOOK.glintAlpha);
    const stroke = softPaint();
    stroke.setStyle(PaintStyle.Stroke);
    stroke.setStrokeWidth(LOOK.outlineWidth);
    stroke.setColor(withAlpha(LOOK.glassColor, LOOK.outlineAlpha));
    canvas.drawPath(outline, stroke);
    drawFrame(canvas, layout);
  }, bounds);

  return { back, front };
}

export function createRenderKit(layout: GlassLayout): RenderKit {
  return { layout, atlas: createSandAtlas(), glass: createGlassArt(layout), paint: Skia.Paint() };
}

export function createAtlasBuffers(count: number, atlas: SandAtlas): AtlasBuffers {
  'worklet';
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];
  for (let i = 0; i < count; i++) {
    sprites.push(atlas.grains[0]);
    transforms.push(Skia.RSXform(0, 0, 0, 0));
  }
  return { sprites, transforms };
}

function drawSand(canvas: SkCanvas, state: SandState, atlas: SandAtlas, buffers: AtlasBuffers, paint: SkPaint) {
  'worklet';
  const { cellOf, speed, tone, jitterX, jitterY, stride, cell } = state;
  const { sprites, transforms } = buffers;
  const { grains, streaks, streakHeads } = atlas;
  const diameter = cell * SAND.grainSize;
  const scale = diameter / SPRITE.size;
  const half = SPRITE.size / 2;
  const centerColumn = (state.columns + 1) / 2;
  const centerRow = (state.rows + 1) / 2;
  // Streaks point along gravity, so their tails trail back up the fall.
  const along = Math.atan2(state.gravityY, state.gravityX);
  const streakCos = scale * Math.cos(along);
  const streakSin = scale * Math.sin(along);
  // A grain's streak length, in grains, per cell-a-step of speed.
  const streakPerSpeed = (cell * SPRITE.blurSteps) / diameter;
  const longest = streaks.length - 1;

  for (let i = 0; i < state.count; i++) {
    const index = cellOf[i];
    const row = (index / stride) | 0;
    const x = (index - row * stride - centerColumn + jitterX[i]) * cell;
    const y = (row - centerRow + jitterY[i]) * cell;
    const length = (speed[i] * streakPerSpeed) | 0;
    if (length < SPRITE.shortestStreak) {
      sprites[i] = grains[tone[i]];
      transforms[i].set(scale, 0, x - diameter / 2, y - diameter / 2);
    } else {
      // Rotate the streak along gravity about its head, and put the head on the grain.
      const level = Math.min(longest, length - SPRITE.shortestStreak);
      const head = streakHeads[level];
      sprites[i] = streaks[level];
      transforms[i].set(streakCos, streakSin, x - (streakCos * head - streakSin * half), y - (streakSin * head + streakCos * half));
    }
  }
  canvas.drawAtlas(atlas.image, sprites, transforms, paint);
}

/** The hourglass at its current turn, shrunk to fit if it's mid-flip. */
export function drawHourglass(canvas: SkCanvas, state: SandState, kit: RenderKit, buffers: AtlasBuffers, angle: number) {
  'worklet';
  const { layout } = kit;
  const scale = fitScale(layout, angle);
  canvas.save();
  canvas.translate(layout.centerX, layout.centerY);
  canvas.rotate(angle * DEGREES_PER_RADIAN, 0, 0);
  canvas.scale(scale, scale);
  canvas.drawPicture(kit.glass.back);
  drawSand(canvas, state, kit.atlas, buffers, kit.paint);
  canvas.drawPicture(kit.glass.front);
  canvas.restore();
}
