// The parts of the night that hold still, drawn once into images at screen resolution, so all
// this detail costs a few texture draws a frame: the sky with a faint Milky Way; the landscape
// (a hazy far forest, low mist, a dark near forest and the far meadow); the jar; a strip of mist
// that tiles sideways so it can drift; and a vignette. What moves is drawn each frame on top.
import { BlendMode, BlurStyle, createPicture, PaintStyle, Skia, StrokeCap, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint, SkPath, SkPicture, SkPoint, SkRect } from '@shopify/react-native-skia';

import type { SeededRandom } from '@/shared/seededRandom';
import { colorPaint, mixColors, renderToImage, withAlpha } from '@/shared/skia';

import type { ForestShape } from './constants';
import { FAR_FOREST, FIELD, HORIZON_GLOW, MILKY_WAY, MIST, NEAR_FOREST, SEED, SKY, TREE, VIGNETTE } from './constants';
import { drawJar } from './jar';
import type { JarLayout } from './jar';
import { milkyWayFrame } from './sky';

const BLACK = '#000000';
/** No tiling: noise that doesn't need to wrap. */
const UNTILED = 0;

export type SceneArt = {
  sky: SkImage;
  landscape: SkImage;
  jar: SkImage;
  /** A band of mist as wide as the screen that tiles sideways, and where it sits. */
  mist: SkImage;
  mistTop: number;
  mistHeight: number;
  vignette: SkPicture;
};

/**
 * Fractal noise turned into a tint whose alpha follows the noise, clear below `threshold`. Given
 * a tile size, the noise wraps seamlessly at it.
 */
function noisePaint(
  color: string,
  alpha: number,
  threshold: number,
  freqX: number,
  freqY: number,
  octaves: number,
  tileWidth = UNTILED,
  tileHeight = UNTILED,
): SkPaint {
  const tint = Skia.Color(color);
  const gain = alpha / (1 - threshold);
  const paint = Skia.Paint();
  paint.setShader(Skia.Shader.MakeFractalNoise(freqX, freqY, octaves, SEED, tileWidth, tileHeight));
  // prettier-ignore
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix([
    0, 0, 0, 0, tint[0],
    0, 0, 0, 0, tint[1],
    0, 0, 0, 0, tint[2],
    gain, 0, 0, 0, -threshold * gain,
  ]));
  return paint;
}

/** Fills the screen with `paint`, kept only in a soft band from `from` to `to` that is strongest at `middle` (0 to 1) of the way. */
function drawBand(canvas: SkCanvas, bounds: SkRect, paint: SkPaint, from: SkPoint, to: SkPoint, middle: number) {
  canvas.saveLayer();
  canvas.drawRect(bounds, paint);
  const keep = Skia.Paint();
  keep.setBlendMode(BlendMode.DstIn);
  keep.setShader(
    Skia.Shader.MakeLinearGradient(from, to, [withAlpha(BLACK, 0), withAlpha(BLACK, 1), withAlpha(BLACK, 0)], [0, middle, 1], TileMode.Clamp),
  );
  canvas.drawRect(bounds, keep);
  canvas.restore();
}

function drawSky(canvas: SkCanvas, width: number, height: number, bounds: SkRect) {
  const sky = Skia.Paint();
  sky.setShader(
    Skia.Shader.MakeLinearGradient(vec(0, 0), vec(0, height), SKY.colors.map((color) => Skia.Color(color)), [...SKY.positions], TileMode.Clamp),
  );
  canvas.drawRect(bounds, sky);

  const glow = Skia.Paint();
  glow.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(width / 2, height * HORIZON_GLOW.centerY),
      height * HORIZON_GLOW.radius,
      [withAlpha(HORIZON_GLOW.color, HORIZON_GLOW.alpha), withAlpha(HORIZON_GLOW.color, 0)],
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(bounds, glow);
}

function drawMilkyWay(canvas: SkCanvas, width: number, height: number, bounds: SkRect) {
  const band = milkyWayFrame(width, height);
  const frequency = 1 / MILKY_WAY.featureDp;
  const paint = noisePaint(MILKY_WAY.color, MILKY_WAY.alpha, MILKY_WAY.threshold, frequency, frequency, MILKY_WAY.octaves);
  // Across the band is perpendicular to along it.
  const acrossX = -band.alongY * band.halfWidth;
  const acrossY = band.alongX * band.halfWidth;
  drawBand(
    canvas,
    bounds,
    paint,
    vec(band.centerX - acrossX, band.centerY - acrossY),
    vec(band.centerX + acrossX, band.centerY + acrossY),
    1 / 2,
  );
}

/** Raises the outline to cover a circle of `radius` centred at `centerX`, `centerRise` dp above the baseline. */
function raiseCircle(rise: Float32Array, centerX: number, centerRise: number, radius: number) {
  const first = Math.max(0, Math.floor((centerX - radius) / TREE.step));
  const last = Math.min(rise.length - 1, Math.ceil((centerX + radius) / TREE.step));
  for (let i = first; i <= last; i++) {
    const dx = i * TREE.step - centerX;
    if (Math.abs(dx) < radius) {
      rise[i] = Math.max(rise[i], centerRise + Math.sqrt(radius * radius - dx * dx));
    }
  }
}

/** Raises the outline to cover a triangle `peak` dp tall, its base `baseRise` dp up and `halfWidth` either side of `centerX`. */
function raiseTriangle(rise: Float32Array, centerX: number, baseRise: number, halfWidth: number, peak: number) {
  const first = Math.max(0, Math.floor((centerX - halfWidth) / TREE.step));
  const last = Math.min(rise.length - 1, Math.ceil((centerX + halfWidth) / TREE.step));
  for (let i = first; i <= last; i++) {
    const across = Math.abs(i * TREE.step - centerX) / halfWidth;
    if (across < 1) {
      rise[i] = Math.max(rise[i], baseRise + peak * (1 - across));
    }
  }
}

/** A broadleaf crown: round clusters of leaves scattered through a dome, so its edge is scalloped. */
function addCrown(rise: Float32Array, centerX: number, halfWidth: number, treeHeight: number, shape: ForestShape, random: SeededRandom) {
  const crownHalfHeight = (treeHeight * TREE.crownDepth) / 2;
  const crownMiddle = treeHeight - crownHalfHeight;
  const typicalRadius = (shape.minLeafCluster + shape.maxLeafCluster) / 2;
  const clusters = Math.ceil((TREE.clusterCover * halfWidth * crownHalfHeight) / (typicalRadius * typicalRadius));
  for (let k = 0; k < clusters; k++) {
    const radius = random.range(shape.minLeafCluster, shape.maxLeafCluster);
    // A random point in the dome, kept in far enough that the cluster stays inside it.
    const angle = random.next() * Math.PI * 2;
    const reach = Math.sqrt(random.next());
    const x = centerX + Math.cos(angle) * reach * Math.max(0, halfWidth - radius);
    const y = crownMiddle + Math.sin(angle) * reach * Math.max(0, crownHalfHeight - radius);
    raiseCircle(rise, x, y, radius);
  }
}

/** A conifer: stacked tiers of branches, each a little triangle, narrowing to the tip. */
function addSpire(rise: Float32Array, centerX: number, halfWidth: number, treeHeight: number, random: SeededRandom) {
  const tiers = Math.max(1, Math.round(treeHeight / TREE.tierDp));
  const spacing = treeHeight / (tiers + TREE.tierRise - 1);
  for (let k = 0; k < tiers; k++) {
    const narrowing = 1 - k / tiers;
    const tierHalfWidth = halfWidth * narrowing * (1 + random.range(-TREE.tierJitter, TREE.tierJitter));
    raiseTriangle(rise, centerX, k * spacing, tierHalfWidth, spacing * TREE.tierRise);
  }
}

/** A forest edge: trees of random sizes, overlapping, with a leafy, ragged outline. */
function forestPath(width: number, height: number, shape: ForestShape, random: SeededRandom): SkPath {
  const samples = Math.ceil(width / TREE.step) + 1;
  const rise = new Float32Array(samples);
  const base = shape.baseline * height;
  const middle = width / 2;
  const tallest = shape.maxHeight * height * (1 + shape.edgeGrowth);

  let x = -tallest;
  while (x < width + tallest) {
    // Trees toward the sides grow taller, framing the clearing.
    const side = Math.min(1, Math.abs(x - middle) / middle);
    const treeHeight = random.range(shape.minHeight, shape.maxHeight) * height * (1 + shape.edgeGrowth * side * side);
    const conifer = random.next() < shape.conifers;
    const halfWidth =
      treeHeight * (conifer ? random.range(TREE.minSpireWidth, TREE.maxSpireWidth) : random.range(TREE.minCrownWidth, TREE.maxCrownWidth));
    const center = x + halfWidth;
    if (conifer) {
      addSpire(rise, center, halfWidth, treeHeight, random);
    } else {
      addCrown(rise, center, halfWidth, treeHeight, shape, random);
    }
    x += halfWidth * random.range(TREE.minSpacing, TREE.maxSpacing);
  }

  const path = Skia.PathBuilder.Make();
  path.moveTo(0, height);
  for (let i = 0; i < samples; i++) {
    // Leaves and needles break up the outline.
    path.lineTo(i * TREE.step, base - rise[i] - random.next() * shape.ragged);
  }
  path.lineTo(width, height);
  path.close();
  return path.build();
}

function drawForest(canvas: SkCanvas, width: number, height: number, shape: ForestShape, random: SeededRandom) {
  const paint = colorPaint(shape.color);
  if (shape.blur > 0) {
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, shape.blur, true));
  }
  canvas.drawPath(forestPath(width, height, shape, random), paint);
}

function drawMist(canvas: SkCanvas, height: number, bounds: SkRect) {
  const paint = noisePaint(MIST.color, MIST.alpha, MIST.threshold, 1 / MIST.featureWidth, 1 / MIST.featureHeight, MIST.octaves);
  const top = height * MIST.top;
  const bottom = height * MIST.bottom;
  drawBand(canvas, bounds, paint, vec(0, top), vec(0, bottom), (height * MIST.middle - top) / (bottom - top));
}

/** The drifting mist: the same band, fainter, in a strip whose noise wraps at the screen's width. */
function renderMistStrip(width: number, stripHeight: number, middle: number, pixelRatio: number): SkImage {
  const bounds = Skia.XYWHRect(0, 0, width, stripHeight);
  return renderToImage(width, stripHeight, pixelRatio, (canvas) => {
    const paint = noisePaint(
      MIST.color,
      MIST.alpha * MIST.driftShare,
      MIST.threshold,
      1 / MIST.featureWidth,
      1 / MIST.featureHeight,
      MIST.octaves,
      width,
      stripHeight,
    );
    drawBand(canvas, bounds, paint, vec(0, 0), vec(0, stripHeight), middle);
  });
}

/**
 * The meadow floor and its far grass: short and dense at the edge of the forest. The nearer
 * blades sway, so they're drawn each frame (see grass.ts), from the same distribution.
 */
function drawField(canvas: SkCanvas, width: number, height: number, random: SeededRandom) {
  const top = FIELD.top * height;
  const floor = Skia.Paint();
  floor.setShader(
    Skia.Shader.MakeLinearGradient(vec(0, top), vec(0, height), FIELD.colors.map((color) => Skia.Color(color)), null, TileMode.Clamp),
  );
  canvas.drawRect(Skia.XYWHRect(0, top, width, height - top), floor);

  const bands = Array.from({ length: FIELD.bands }, () => Skia.PathBuilder.Make());
  for (let i = 0; i < FIELD.blades; i++) {
    const depth = random.next() ** FIELD.crowding;
    const rootY = top + (height - top) * depth;
    const bladeHeight = FIELD.farHeight + (FIELD.nearHeight - FIELD.farHeight) * depth;
    const rootX = random.next() * width;
    const lean = random.range(-FIELD.lean, FIELD.lean) * bladeHeight;
    if (depth >= FIELD.swayFrom) {
      continue;
    }
    const path = bands[Math.min(FIELD.bands - 1, Math.floor(depth * FIELD.bands))];
    path.moveTo(rootX, rootY);
    path.quadTo(rootX + lean / 3, rootY - bladeHeight / 2, rootX + lean, rootY - bladeHeight);
  }
  bands.forEach((path, band) => {
    const depth = (band + 1 / 2) / FIELD.bands;
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setColor(mixColors(FIELD.farColor, FIELD.nearColor, depth));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeWidth(FIELD.farWidth + (FIELD.nearWidth - FIELD.farWidth) * depth);
    canvas.drawPath(path.build(), paint);
  });
}

function drawVignette(canvas: SkCanvas, width: number, height: number, bounds: SkRect) {
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(width / 2, height / 2),
      height * VIGNETTE.radius,
      [withAlpha(BLACK, 0), withAlpha(BLACK, 0), withAlpha(BLACK, VIGNETTE.alpha)],
      [0, VIGNETTE.clear, 1],
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(bounds, paint);
}

export function createSceneArt(width: number, height: number, jar: JarLayout, pixelRatio: number, random: SeededRandom): SceneArt {
  const bounds = Skia.XYWHRect(0, 0, width, height);

  const sky = renderToImage(width, height, pixelRatio, (canvas) => {
    drawSky(canvas, width, height, bounds);
    drawMilkyWay(canvas, width, height, bounds);
  });

  const landscape = renderToImage(width, height, pixelRatio, (canvas) => {
    drawForest(canvas, width, height, FAR_FOREST, random);
    drawMist(canvas, height, bounds);
    drawForest(canvas, width, height, NEAR_FOREST, random);
    drawField(canvas, width, height, random);
  });

  const mistTop = height * MIST.top;
  const mistHeight = height * (MIST.bottom - MIST.top);
  const mist = renderMistStrip(width, mistHeight, (height * MIST.middle - mistTop) / mistHeight, pixelRatio);

  return {
    sky,
    landscape,
    jar: renderToImage(width, height, pixelRatio, (canvas) => drawJar(canvas, jar)),
    mist,
    mistTop,
    mistHeight,
    vignette: createPicture((canvas) => drawVignette(canvas, width, height, bounds), bounds),
  };
}
