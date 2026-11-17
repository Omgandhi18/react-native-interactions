// Drawing for Murmuration. The sky, hills and treeline are recorded once as pictures. The flock
// is one drawAtlas call a frame: each bird points at a sprite for its depth tone and wing pose,
// turned to the way it's flying on screen and scaled by perspective. Colours are baked into the
// strip because per-sprite colours are the slowest thing drawAtlas copies into native code.
import { createPicture, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint, SkPath, SkPicture, SkRect, SkRSXform } from '@shopify/react-native-skia';

import { createSeededRandom } from '@/shared/seededRandom';
import type { SeededRandom } from '@/shared/seededRandom';
import { colorPaint, renderToImage, withAlpha } from '@/shared/skia';

import { BIRD, BIRD_SPRITE, HILLS, SEED, SKY, SUN, TONES, TREES } from './constants';
import type { FlockState } from './simulation';

const TWO_PI = Math.PI * 2;
/** A cubic Bézier whose two control points sit this many times higher than its ends peaks at exactly 1. */
const CUBIC_PEAK = 4 / 3;

export type BirdAtlas = {
  image: SkImage;
  /** One per depth tone per wing pose: `sprites[tone * poses + pose]`. */
  sprites: SkRect[];
  poses: number;
};

/** The per-bird arrays drawAtlas reads. Built once on the UI thread, then updated in place. */
export type AtlasBuffers = {
  sprites: SkRect[];
  transforms: SkRSXform[];
};

export type SkyArt = {
  /** The sky, the low sun and the far hills, behind the birds. */
  back: SkPicture;
  /** The treeline, in front of them. */
  front: SkPicture;
};

export type RenderKit = {
  atlas: BirdAtlas;
  sky: SkyArt;
  paint: SkPaint;
};

/**
 * A starling seen from below, heading along +x and centred on (centerX, centerY): pointed,
 * swept-back wings opened to `span` of their reach, a slim body and head, and a short square tail.
 */
function drawStarling(canvas: SkCanvas, centerX: number, centerY: number, span: number, paint: SkPaint) {
  const { size, fullSpan, body, head, tail, wing } = BIRD_SPRITE;
  canvas.drawOval(
    Skia.XYWHRect(
      centerX - (size * body.length) / 2,
      centerY - (size * body.width) / 2,
      size * body.length,
      size * body.width,
    ),
    paint,
  );
  canvas.drawCircle(centerX + size * head.ahead, centerY, size * head.radius, paint);

  const tailRoot = centerX - size * tail.behind;
  const tailTip = tailRoot - size * tail.length;
  const tailPath = Skia.PathBuilder.Make();
  tailPath.moveTo(tailRoot, centerY - (size * tail.rootWidth) / 2);
  tailPath.lineTo(tailTip, centerY - (size * tail.tipWidth) / 2);
  tailPath.lineTo(tailTip, centerY + (size * tail.tipWidth) / 2);
  tailPath.lineTo(tailRoot, centerY + (size * tail.rootWidth) / 2);
  tailPath.close();
  canvas.drawPath(tailPath.build(), paint);

  // Each wing: a leading edge that bows forward then sweeps back to the tip, and a straight trailing edge.
  const reach = (size * fullSpan * span) / 2;
  const front = centerX + size * wing.rootFront;
  const back = centerX - size * wing.rootBack;
  const tipX = centerX - size * wing.sweep;
  [-1, 1].forEach((side) => {
    const wingPath = Skia.PathBuilder.Make();
    wingPath.moveTo(front, centerY);
    wingPath.quadTo(front, centerY + side * reach * wing.leadingBow, tipX, centerY + side * reach);
    wingPath.lineTo(back, centerY);
    wingPath.close();
    canvas.drawPath(wingPath.build(), paint);
  });
}

function createBirdAtlas(): BirdAtlas {
  const { size, spans } = BIRD_SPRITE;
  const poses = spans.length;
  const sprites: SkRect[] = [];
  for (let i = 0; i < TONES.colors.length * poses; i++) {
    sprites.push(Skia.XYWHRect(i * size, 0, size, size));
  }

  const image = renderToImage(sprites.length * size, size, 1, (canvas) => {
    TONES.colors.forEach((color, tone) => {
      const paint = colorPaint(color);
      // Each bird is drawn solid into a layer and faded as a whole, so overlapping parts don't darken.
      const fade = Skia.Paint();
      fade.setAlphaf(TONES.alphas[tone]);
      spans.forEach((span, pose) => {
        canvas.saveLayer(fade);
        drawStarling(canvas, (tone * poses + pose) * size + size / 2, size / 2, span, paint);
        canvas.restore();
      });
    });
  });

  return { image, sprites, poses };
}

/** A smooth hazy ridge: a baseline with a couple of waves on it. */
function hillsPath(width: number, height: number, random: SeededRandom): SkPath {
  const phases = HILLS.frequencies.map(() => random.range(0, TWO_PI));
  const path = Skia.PathBuilder.Make();
  path.moveTo(0, height);
  for (let x = 0; x <= width + HILLS.step; x += HILLS.step) {
    let y = HILLS.baseline * height;
    HILLS.frequencies.forEach((frequency, i) => {
      y -= HILLS.amplitudes[i] * height * Math.sin((TWO_PI * frequency * x) / width + phases[i]);
    });
    path.lineTo(x, y);
  }
  path.lineTo(width + HILLS.step, height);
  path.close();
  return path.build();
}

/** A row of rounded tree crowns of random widths and heights. */
function treelinePath(width: number, height: number, random: SeededRandom): SkPath {
  const base = TREES.baseline * height;
  const path = Skia.PathBuilder.Make();
  path.moveTo(0, height);
  path.lineTo(0, base);
  let x = 0;
  while (x < width) {
    const crownWidth = random.range(TREES.minWidth, TREES.maxWidth) * width;
    const top = base - random.range(TREES.minHeight, TREES.maxHeight) * height * CUBIC_PEAK;
    path.cubicTo(x, top, x + crownWidth, top, x + crownWidth, base);
    x += crownWidth;
  }
  path.lineTo(x, height);
  path.close();
  return path.build();
}

function createSkyArt(width: number, height: number): SkyArt {
  const random = createSeededRandom(SEED);
  const bounds = Skia.XYWHRect(0, 0, width, height);

  const back = createPicture((canvas) => {
    const sky = Skia.Paint();
    sky.setShader(
      Skia.Shader.MakeLinearGradient(
        vec(0, 0),
        vec(0, height),
        SKY.colors.map((color) => Skia.Color(color)),
        [...SKY.positions],
        TileMode.Clamp,
      ),
    );
    canvas.drawRect(bounds, sky);

    const sun = Skia.Paint();
    const sunCenter = vec(width * SUN.x, height * SUN.y);
    sun.setShader(
      Skia.Shader.MakeRadialGradient(
        sunCenter,
        height * SUN.radius,
        [withAlpha(SUN.color, SUN.alpha), withAlpha(SUN.color, 0)],
        null,
        TileMode.Clamp,
      ),
    );
    canvas.drawRect(bounds, sun);

    canvas.drawPath(hillsPath(width, height, random), colorPaint(HILLS.color));
  }, bounds);

  const front = createPicture((canvas) => {
    canvas.drawPath(treelinePath(width, height, random), colorPaint(TREES.color));
  }, bounds);

  return { back, front };
}

export function createRenderKit(width: number, height: number): RenderKit {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  return { atlas: createBirdAtlas(), sky: createSkyArt(width, height), paint };
}

export function createAtlasBuffers(count: number, atlas: BirdAtlas): AtlasBuffers {
  'worklet';
  const sprites: SkRect[] = [];
  const transforms: SkRSXform[] = [];
  for (let i = 0; i < count; i++) {
    sprites.push(atlas.sprites[0]);
    transforms.push(Skia.RSXform(0, 0, 0, 0));
  }
  return { sprites, transforms };
}

export function drawFlock(canvas: SkCanvas, state: FlockState, kit: RenderKit, buffers: AtlasBuffers) {
  'worklet';
  const { atlas, paint } = kit;
  const { sprites, transforms } = buffers;
  const { screenX, screenY, depthScale, vx, vy, z, wingPhase, flapping } = state;
  const half = BIRD_SPRITE.size / 2;
  const dpPerPixel = BIRD.spanDp / (BIRD_SPRITE.size * BIRD_SPRITE.fullSpan);
  const cycle = BIRD_SPRITE.flapCycle;
  const tones = TONES.colors.length;
  const tonesPerDp = tones / (2 * TONES.depthRange);

  for (let i = 0; i < state.count; i++) {
    const tone = Math.min(tones - 1, Math.max(0, Math.floor((z[i] + TONES.depthRange) * tonesPerDp)));
    const pose = flapping[i] === 1 ? cycle[Math.floor(wingPhase[i] * cycle.length)] : 0;
    sprites[i] = atlas.sprites[tone * atlas.poses + pose];
    // Face the way the bird crosses the screen, and put the sprite's centre on the bird.
    const scale = dpPerPixel * depthScale[i];
    const across = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
    const cos = across > 0 ? (scale * vx[i]) / across : scale;
    const sin = across > 0 ? (scale * vy[i]) / across : 0;
    transforms[i].set(cos, sin, screenX[i] - (cos * half - sin * half), screenY[i] - (sin * half + cos * half));
  }

  canvas.save();
  canvas.translate(state.centerX, state.centerY);
  canvas.drawAtlas(atlas.image, sprites, transforms, paint);
  canvas.restore();
}
