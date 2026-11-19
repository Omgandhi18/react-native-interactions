// Drawing for Fireflies, back to front, once a frame. Baked images (see scenery.ts) sit between
// the parts that move: twinkling stars and shooting stars behind the trees; drifting mist and
// swaying grass in the meadow; the jar's glow, the fireflies and the meadow's light; then the
// jar, the swaying grass in front of it, and the vignette.
//
// The fireflies are one drawAtlas call, added onto the dark scene so overlapping glows brighten:
// each points at a glow sprite for its brightness, baked into a strip because per-sprite colours
// are the slowest thing drawAtlas copies into native code.
import { BlendMode, PaintStyle, Skia, StrokeCap, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkPaint, SkRect } from '@shopify/react-native-skia';

import { createSeededRandom } from '@/shared/seededRandom';
import { imageBounds, renderToImage, withAlpha } from '@/shared/skia';

import type { AtlasBuffers, SpriteAtlas } from './atlas';
import { createAtlasBuffers, SMOOTH, stripCells } from './atlas';
import { AMBIENT, GLOW, JAR_GLOW, METEOR, MIST, SEED, SWARM } from './constants';
import type { GrassLayer } from './grass';
import { createFieldGrass, createForegroundGrass, drawGrass } from './grass';
import type { JarLayout } from './jar';
import type { SceneArt } from './scenery';
import { createSceneArt } from './scenery';
import type { Meteor, StarField } from './sky';
import { createStarField, drawMeteor, drawStars } from './sky';
import type { SwarmState } from './simulation';

export type RenderKit = {
  scene: SceneArt;
  /** The source rect of a full-screen baked image, and of the mist strip. */
  screenSource: SkRect;
  mistSource: SkRect;
  stars: StarField;
  fieldGrass: GrassLayer;
  foregroundGrass: GrassLayer;
  glowAtlas: SpriteAtlas;
  /** Plain drawing, light added onto the scene, and the shooting star's stroke. */
  plainPaint: SkPaint;
  addPaint: SkPaint;
  meteorPaint: SkPaint;
  /** The meadow's light from the swarm, and the jar's from the sleepers; alphas set each frame. */
  ambientPaint: SkPaint;
  jarGlowPaint: SkPaint;
  width: number;
  bounds: SkRect;
};

/** Every layer's drawAtlas arrays. Made on the UI thread's first frame. */
export type FrameBuffers = {
  stars: AtlasBuffers;
  fieldGrass: AtlasBuffers;
  fireflies: AtlasBuffers;
  foregroundGrass: AtlasBuffers;
};

function createGlowAtlas(): SpriteAtlas {
  const { levels, size } = GLOW;
  const radius = size / 2;
  const sprites = stripCells(levels, size, size);
  const image = renderToImage(levels * size, size, 1, (canvas) => {
    for (let level = 1; level < levels; level++) {
      const strength = level / (levels - 1);
      const center = vec(level * size + radius, radius);
      const paint = Skia.Paint();
      paint.setShader(
        Skia.Shader.MakeRadialGradient(
          center,
          radius,
          GLOW.colors.map((color, i) => withAlpha(color, GLOW.alphas[i] * strength)),
          [...GLOW.positions],
          TileMode.Clamp,
        ),
      );
      canvas.drawCircle(center.x, center.y, radius, paint);
    }
  });
  return { image, sprites };
}

/** A paint that adds a soft round light of `color` onto whatever is below. */
function lightPaint(color: string, center: { x: number; y: number }, radius: number): SkPaint {
  const paint = Skia.Paint();
  paint.setBlendMode(BlendMode.Plus);
  paint.setShader(Skia.Shader.MakeRadialGradient(vec(center.x, center.y), radius, [Skia.Color(color), withAlpha(color, 0)], null, TileMode.Clamp));
  return paint;
}

export function createRenderKit(width: number, height: number, jar: JarLayout, pixelRatio: number): RenderKit {
  // One random stream, drawn from in a fixed order, so every launch looks the same.
  const random = createSeededRandom(SEED);
  const scene = createSceneArt(width, height, jar, pixelRatio, random);

  const plainPaint = Skia.Paint();
  plainPaint.setAntiAlias(true);
  const addPaint = Skia.Paint();
  addPaint.setBlendMode(BlendMode.Plus);
  const meteorPaint = Skia.Paint();
  meteorPaint.setAntiAlias(true);
  meteorPaint.setBlendMode(BlendMode.Plus);
  meteorPaint.setStyle(PaintStyle.Stroke);
  meteorPaint.setStrokeWidth(METEOR.width);
  meteorPaint.setStrokeCap(StrokeCap.Round);

  return {
    scene,
    screenSource: imageBounds(scene.sky),
    mistSource: imageBounds(scene.mist),
    stars: createStarField(width, height, random),
    fieldGrass: createFieldGrass(width, height, random),
    foregroundGrass: createForegroundGrass(width, height, random),
    glowAtlas: createGlowAtlas(),
    plainPaint,
    addPaint,
    meteorPaint,
    ambientPaint: lightPaint(AMBIENT.color, { x: width / 2, y: height * AMBIENT.centerY }, height * AMBIENT.radius),
    jarGlowPaint: lightPaint(JAR_GLOW.color, { x: jar.centerX, y: (jar.bodyTopY + jar.bottomY) / 2 }, jar.halfWidth * 2 * JAR_GLOW.radius),
    width,
    bounds: Skia.XYWHRect(0, 0, width, height),
  };
}

export function createFrameBuffers(kit: RenderKit, fireflies: number): FrameBuffers {
  'worklet';
  return {
    stars: createAtlasBuffers(kit.stars.count, kit.stars.atlas),
    fieldGrass: createAtlasBuffers(kit.fieldGrass.count, kit.fieldGrass.atlas),
    fireflies: createAtlasBuffers(fireflies, kit.glowAtlas),
    foregroundGrass: createAtlasBuffers(kit.foregroundGrass.count, kit.foregroundGrass.atlas),
  };
}

function drawScreenImage(canvas: SkCanvas, image: SkImage, kit: RenderKit) {
  'worklet';
  canvas.drawImageRect(image, kit.screenSource, kit.bounds, kit.plainPaint);
}

/** The mist strip, slid sideways and drawn twice so it wraps round. */
function drawDriftingMist(canvas: SkCanvas, kit: RenderKit, time: number) {
  'worklet';
  const { mist, mistTop, mistHeight } = kit.scene;
  const offset = (time * MIST.driftSpeed) % kit.width;
  canvas.drawImageRect(mist, kit.mistSource, Skia.XYWHRect(-offset, mistTop, kit.width, mistHeight), kit.plainPaint);
  canvas.drawImageRect(mist, kit.mistSource, Skia.XYWHRect(kit.width - offset, mistTop, kit.width, mistHeight), kit.plainPaint);
}

function drawSwarm(canvas: SkCanvas, state: SwarmState, kit: RenderKit, buffers: AtlasBuffers) {
  'worklet';
  const { glowAtlas } = kit;
  const { sprites, transforms } = buffers;
  const { x, y, depth, brightness } = state;
  const half = GLOW.size / 2;
  const fullScale = (GLOW.radiusDp * 2) / GLOW.size;
  const brightest = GLOW.levels - 1;

  if (state.asleepShare > 0) {
    kit.jarGlowPaint.setAlphaf(JAR_GLOW.alpha * state.asleepShare);
    canvas.drawRect(kit.bounds, kit.jarGlowPaint);
  }

  for (let i = 0; i < state.count; i++) {
    const glow = brightness[i];
    sprites[i] = glowAtlas.sprites[Math.round(glow * brightest)];
    // The glow also swells as it brightens, which hides the steps between brightness levels.
    const nearness = SWARM.farScale + (SWARM.nearScale - SWARM.farScale) * depth[i];
    const scale = fullScale * nearness * (GLOW.minSwell + (1 - GLOW.minSwell) * glow);
    transforms[i].set(scale, 0, x[i] - half * scale, y[i] - half * scale);
  }
  canvas.drawAtlas(glowAtlas.image, sprites, transforms, kit.addPaint, undefined, undefined, SMOOTH);

  kit.ambientPaint.setAlphaf(AMBIENT.alpha * state.glow);
  canvas.drawRect(kit.bounds, kit.ambientPaint);
}

/** The whole scene for one frame. Until the buffers exist (the first frame), only the still parts. */
export function drawScene(canvas: SkCanvas, state: SwarmState, meteor: Meteor, kit: RenderKit, buffers: FrameBuffers | null) {
  'worklet';
  const { time } = state;
  const { scene } = kit;

  drawScreenImage(canvas, scene.sky, kit);
  if (buffers) {
    drawStars(canvas, kit.stars, buffers.stars, time, kit.addPaint);
  }
  drawMeteor(canvas, meteor, time, kit.meteorPaint);

  drawScreenImage(canvas, scene.landscape, kit);
  drawDriftingMist(canvas, kit, time);
  if (buffers) {
    drawGrass(canvas, kit.fieldGrass, buffers.fieldGrass, time, kit.plainPaint);
    drawSwarm(canvas, state, kit, buffers.fireflies);
  }

  drawScreenImage(canvas, scene.jar, kit);
  if (buffers) {
    drawGrass(canvas, kit.foregroundGrass, buffers.foregroundGrass, time, kit.plainPaint);
  }
  canvas.drawPicture(scene.vignette);
}
