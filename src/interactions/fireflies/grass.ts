// Grass that moves in the wind: the nearer part of the meadow, and the tall blades right in front
// of the camera. Each blade is a sprite turned about its root by the wind (see wind.ts) plus a
// little flutter of its own, drawn back to front in one drawAtlas call per layer.
import { PaintStyle, Skia, TileMode } from '@shopify/react-native-skia';
import type { SkCanvas, SkColor, SkPaint } from '@shopify/react-native-skia';

import type { SeededRandom } from '@/shared/seededRandom';
import { mixColors, renderToImage } from '@/shared/skia';

import type { AtlasBuffers, SpriteAtlas } from './atlas';
import { SMOOTH, stripCells } from './atlas';
import { FIELD, FIELD_SPRITE, FOREGROUND, FOREGROUND_SPRITE, SWAY } from './constants';
import { windAt } from './wind';

const DEGREES_TO_RADIANS = Math.PI / 180;
/** Each field band has a blade curving left and one curving right. */
const CURVES = [-1, 1] as const;

export type GrassLayer = {
  count: number;
  rootX: Float32Array;
  rootY: Float32Array;
  scale: Float32Array;
  /** Its lean at rest, and how far the wind turns it at full strength, in radians. */
  lean: Float32Array;
  sway: Float32Array;
  flutterSpeed: Float32Array;
  flutterPhase: Float32Array;
  sprite: Uint8Array;
  atlas: SpriteAtlas;
  /** Where a blade's root sits in its sprite, in pixels. */
  rootU: number;
  rootV: number;
};

type Blade = { rootX: number; rootY: number; scale: number; lean: number; sway: number; sprite: number };

/** A tapered blade from its root at (x, y), `height` tall, its tip curved `curve` to the side. */
function drawBlade(canvas: SkCanvas, x: number, y: number, height: number, rootWidth: number, curve: number, paint: SkPaint) {
  const tipX = x + curve;
  const bendX = x + curve / 2;
  const bendY = y - height / 2;
  const path = Skia.PathBuilder.Make();
  path.moveTo(x - rootWidth / 2, y);
  path.quadTo(bendX - rootWidth / 4, bendY, tipX, y - height);
  path.quadTo(bendX + rootWidth / 4, bendY, x + rootWidth / 2, y);
  path.close();
  canvas.drawPath(path.build(), paint);
}

/** Packs blades into a layer, sorted far to near so nearer ones are drawn over farther ones. */
function toLayer(blades: Blade[], atlas: SpriteAtlas, rootU: number, rootV: number, random: SeededRandom): GrassLayer {
  blades.sort((a, b) => a.rootY - b.rootY);
  const count = blades.length;
  const floats = () => new Float32Array(count);
  const layer: GrassLayer = {
    count,
    rootX: floats(),
    rootY: floats(),
    scale: floats(),
    lean: floats(),
    sway: floats(),
    flutterSpeed: floats(),
    flutterPhase: floats(),
    sprite: new Uint8Array(count),
    atlas,
    rootU,
    rootV,
  };
  blades.forEach((blade, i) => {
    layer.rootX[i] = blade.rootX;
    layer.rootY[i] = blade.rootY;
    layer.scale[i] = blade.scale;
    layer.lean[i] = blade.lean;
    layer.sway[i] = blade.sway;
    layer.sprite[i] = blade.sprite;
    layer.flutterSpeed[i] = random.range(SWAY.minFlutterSpeed, SWAY.maxFlutterSpeed);
    layer.flutterPhase[i] = random.next() * Math.PI * 2;
  });
  return layer;
}

/** The meadow's nearer blades, which are big enough to see sway. The far ones are baked into the scenery. */
export function createFieldGrass(width: number, height: number, random: SeededRandom): GrassLayer {
  const { width: cellWidth, height: cellHeight, bladeHeight, rootWidth, curve } = FIELD_SPRITE;
  const sprites = stripCells(FIELD.bands * CURVES.length, cellWidth, cellHeight);
  const rootU = cellWidth / 2;
  const rootV = cellHeight;
  const image = renderToImage(sprites.length * cellWidth, cellHeight, 1, (canvas) => {
    for (let band = 0; band < FIELD.bands; band++) {
      const paint = Skia.Paint();
      paint.setAntiAlias(true);
      paint.setColor(mixColors(FIELD.farColor, FIELD.nearColor, (band + 1 / 2) / FIELD.bands));
      CURVES.forEach((side, c) => {
        const cell = band * CURVES.length + c;
        drawBlade(canvas, cell * cellWidth + rootU, rootV, bladeHeight, rootWidth, side * curve * bladeHeight, paint);
      });
    }
  });

  const top = FIELD.top * height;
  const blades: Blade[] = [];
  for (let i = 0; i < FIELD.blades; i++) {
    const depth = random.next() ** FIELD.crowding;
    const rootX = random.next() * width;
    const lean = random.range(-FIELD.lean, FIELD.lean);
    const side = Math.floor(random.next() * CURVES.length);
    if (depth < FIELD.swayFrom) {
      continue;
    }
    const band = Math.min(FIELD.bands - 1, Math.floor(depth * FIELD.bands));
    blades.push({
      rootX,
      rootY: top + (height - top) * depth,
      scale: (FIELD.farHeight + (FIELD.nearHeight - FIELD.farHeight) * depth) / bladeHeight,
      lean: Math.atan(lean),
      sway: SWAY.field * DEGREES_TO_RADIANS,
      sprite: band * CURVES.length + side,
    });
  }
  return toLayer(blades, { image, sprites }, rootU, rootV, random);
}

/** Tall blades and seed heads right in front of the camera, already blurred in their sprites. */
export function createForegroundGrass(width: number, height: number, random: SeededRandom): GrassLayer {
  const { width: cellWidth, height: cellHeight, margin, rootWidth, curve, blades: bladeShapes, seedHeads: seedShapes } = FOREGROUND_SPRITE;
  const shapes = bladeShapes + seedShapes;
  const sprites = stripCells(shapes, cellWidth, cellHeight);
  const rootU = cellWidth / 2;
  const rootV = cellHeight - margin;
  const shapeHeight = cellHeight - margin * 2;
  // The curves are picked up front, so the sprites and the scene draw from the random stream in a fixed order.
  const curves = Array.from({ length: shapes }, () => random.range(-curve, curve) * shapeHeight);

  const color: SkColor = Skia.Color(FOREGROUND.color);
  const image = renderToImage(shapes * cellWidth, cellHeight, 1, (canvas) => {
    const ink = Skia.Paint();
    ink.setAntiAlias(true);
    ink.setColor(color);
    const unfocused = Skia.Paint();
    unfocused.setImageFilter(Skia.ImageFilter.MakeBlur(FOREGROUND_SPRITE.blur, FOREGROUND_SPRITE.blur, TileMode.Decal, null));
    canvas.saveLayer(unfocused);
    for (let k = 0; k < shapes; k++) {
      const x = k * cellWidth + rootU;
      if (k < bladeShapes) {
        drawBlade(canvas, x, rootV, shapeHeight, rootWidth, curves[k], ink);
        continue;
      }
      // A thin stem curving up to an oval seed head.
      const tipX = x + curves[k];
      const tipY = rootV - shapeHeight + FOREGROUND_SPRITE.seedLength;
      const stem = Skia.Paint();
      stem.setAntiAlias(true);
      stem.setColor(color);
      stem.setStyle(PaintStyle.Stroke);
      stem.setStrokeWidth(FOREGROUND_SPRITE.stemWidth);
      const path = Skia.PathBuilder.Make();
      path.moveTo(x, rootV);
      path.quadTo(x + curves[k] / 4, rootV - shapeHeight * (2 / 3), tipX, tipY);
      canvas.drawPath(path.build(), stem);
      canvas.drawOval(
        Skia.XYWHRect(tipX - FOREGROUND_SPRITE.seedWidth / 2, tipY - FOREGROUND_SPRITE.seedLength, FOREGROUND_SPRITE.seedWidth, FOREGROUND_SPRITE.seedLength),
        ink,
      );
    }
    canvas.restore();
  });

  const blades: Blade[] = [];
  const total = FOREGROUND.blades + FOREGROUND.seedHeads;
  for (let i = 0; i < total; i++) {
    const seedHead = i >= FOREGROUND.blades;
    const shape = seedHead ? bladeShapes + Math.floor(random.next() * seedShapes) : Math.floor(random.next() * bladeShapes);
    blades.push({
      rootX: random.next() * width,
      rootY: random.range(FOREGROUND.minRoot, 1) * height + margin,
      scale: (random.range(FOREGROUND.minHeight, FOREGROUND.maxHeight) * height) / shapeHeight,
      lean: random.range(-FOREGROUND.lean, FOREGROUND.lean) * DEGREES_TO_RADIANS,
      sway: SWAY.foreground * DEGREES_TO_RADIANS,
      sprite: shape,
    });
  }
  return toLayer(blades, { image, sprites }, rootU, rootV, random);
}

/** `buffers` must hold exactly `layer.count` entries. */
export function drawGrass(canvas: SkCanvas, layer: GrassLayer, buffers: AtlasBuffers, time: number, paint: SkPaint) {
  'worklet';
  const { sprites, transforms } = buffers;
  const { rootU, rootV } = layer;
  const flutter = SWAY.flutter * DEGREES_TO_RADIANS;
  for (let i = 0; i < layer.count; i++) {
    const x = layer.rootX[i];
    const angle =
      layer.lean[i] + layer.sway[i] * windAt(x, time) + flutter * Math.sin(layer.flutterSpeed[i] * time + layer.flutterPhase[i]);
    const cos = layer.scale[i] * Math.cos(angle);
    const sin = layer.scale[i] * Math.sin(angle);
    sprites[i] = layer.atlas.sprites[layer.sprite[i]];
    // Turn the sprite about its root, and put the root where the blade grows.
    transforms[i].set(cos, sin, x - (cos * rootU - sin * rootV), layer.rootY[i] - (sin * rootU + cos * rootV));
  }
  canvas.drawAtlas(layer.atlas.image, sprites, transforms, paint, undefined, undefined, SMOOTH);
}
