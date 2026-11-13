// Draws one frame of the Monsoon window. Runs on the UI thread inside a Skia picture.
// Layers, back to front: city, rain outside, fog (with wiped holes), drops, lightning.
import {
  BlendMode,
  ClipOp,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  StrokeCap,
  TileMode,
} from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkRect } from '@shopify/react-native-skia';

import { DROP_LOOK, DROPLETS, FOG, LIGHTNING, RAIN, RUNNERS, WIPE } from './constants';
import { hash01, lerp } from './math';
import { imageBounds, type SceneAssets } from './scene';
import {
  gravityAngle,
  lightningIntensity,
  wipeMarkStrength,
  type SimulationState,
} from './simulation';

export type RenderKit = {
  assets: SceneAssets;
  screenRect: SkRect;
  sceneSource: SkRect;
  fogSource: SkRect;
  spriteSource: SkRect;
  filterMode: FilterMode;
  mipmapMode: MipmapMode;
  clipOp: ClipOp;
  paints: {
    image: SkPaint;
    fog: SkPaint;
    wipeLayer: SkPaint;
    wipeMark: SkPaint;
    sprite: SkPaint;
    rain: SkPaint;
    flash: SkPaint;
  };
};

const STRAIGHT_DOWN = Math.PI / 2;
const DEGREES_PER_RADIAN = 180 / Math.PI;
/** Different salts give each rain streak independent speed, length, timing, position and brightness. */
const RAIN_SALT = { speed: 11.7, length: 23.3, phase: 37.1, lane: 51.9, alpha: 67.3 } as const;

/** Creates the paints and rects once on the JS thread, so drawing a frame allocates almost nothing. */
export function createRenderKit(assets: SceneAssets, width: number, height: number): RenderKit {
  const image = Skia.Paint();
  image.setAntiAlias(true);

  const fog = Skia.Paint();
  fog.setAlphaf(FOG.opacity);

  // Wipe marks are drawn into their own layer, blurred for soft edges, then cut out of the fog.
  const wipeLayer = Skia.Paint();
  wipeLayer.setBlendMode(BlendMode.DstOut);
  wipeLayer.setImageFilter(
    Skia.ImageFilter.MakeBlur(WIPE.edgeSoftness, WIPE.edgeSoftness, TileMode.Decal, null),
  );

  const wipeMark = Skia.Paint();
  wipeMark.setAntiAlias(true);
  wipeMark.setColor(Skia.Color('white'));

  const sprite = Skia.Paint();
  sprite.setAntiAlias(true);

  const rain = Skia.Paint();
  rain.setAntiAlias(true);
  rain.setStyle(PaintStyle.Stroke);
  rain.setStrokeCap(StrokeCap.Round);
  rain.setStrokeWidth(RAIN.strokeWidth);
  rain.setColor(Skia.Color(RAIN.color));

  const flash = Skia.Paint();
  flash.setBlendMode(BlendMode.Screen);
  flash.setColor(Skia.Color(LIGHTNING.color));

  return {
    assets,
    screenRect: Skia.XYWHRect(0, 0, width, height),
    sceneSource: imageBounds(assets.clearScene),
    fogSource: imageBounds(assets.foggedScene),
    spriteSource: imageBounds(assets.dropOverlay),
    filterMode: FilterMode.Linear,
    mipmapMode: MipmapMode.None,
    clipOp: ClipOp.Intersect,
    paints: { image, fog, wipeLayer, wipeMark, sprite, rain, flash },
  };
}

// Order matters below: worklets capture what they call when they're defined, so they aren't
// hoisted. Helpers come first and drawFrame, which uses them all, comes last.

function drawImageFull(
  canvas: SkCanvas,
  kit: RenderKit,
  image: SceneAssets['clearScene'],
  source: SkRect,
  paint: SkPaint,
) {
  'worklet';
  canvas.drawImageRectOptions(image, source, kit.screenRect, kit.filterMode, kit.mipmapMode, paint);
}

/** Rain falling outside, in the direction gravity pulls. Only really visible where the fog is wiped. */
function drawRain(canvas: SkCanvas, state: SimulationState, kit: RenderKit) {
  'worklet';
  const angle = (gravityAngle(state) ?? STRAIGHT_DOWN) - RAIN.slant;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  // Streaks start on a line across the screen, perpendicular to the fall direction, long
  // enough to cover the screen whichever way the phone is tilted.
  const span = Math.hypot(state.width, state.height);
  const centerX = state.width / 2;
  const centerY = state.height / 2;
  const paint = kit.paints.rain;

  for (let i = 0; i < RAIN.streakCount; i++) {
    const speed = lerp(RAIN.minSpeed, RAIN.maxSpeed, hash01(i + RAIN_SALT.speed));
    const length = lerp(RAIN.minLength, RAIN.maxLength, hash01(i + RAIN_SALT.length));
    const travel = span + length;
    const progress = (state.time * speed + hash01(i + RAIN_SALT.phase) * travel) % travel;
    const lane = (hash01(i + RAIN_SALT.lane) - 0.5) * span;
    const x = centerX - dirX * (span / 2) - dirY * lane + dirX * (progress - length);
    const y = centerY - dirY * (span / 2) + dirX * lane + dirY * (progress - length);
    paint.setAlphaf(lerp(RAIN.minAlpha, RAIN.maxAlpha, hash01(i + RAIN_SALT.alpha)));
    canvas.drawLine(x, y, x + dirX * length, y + dirY * length, paint);
  }
}

/** The fogged glass, with every wiped patch cut out of it. */
function drawFog(canvas: SkCanvas, state: SimulationState, kit: RenderKit) {
  'worklet';
  // Explicit full-screen bounds, so the blurred edges of wipe marks are never cropped by a
  // layer sized to its content.
  canvas.saveLayer(undefined, kit.screenRect);
  drawImageFull(canvas, kit, kit.assets.foggedScene, kit.fogSource, kit.paints.fog);

  if (state.wipeMarks.length > 0) {
    const markPaint = kit.paints.wipeMark;
    let currentAlpha = -1;
    canvas.saveLayer(kit.paints.wipeLayer, kit.screenRect);
    for (const mark of state.wipeMarks) {
      const strength = wipeMarkStrength(mark, state.time);
      if (strength !== currentAlpha) {
        markPaint.setAlphaf(strength);
        currentAlpha = strength;
      }
      canvas.drawCircle(mark.x, mark.y, mark.r, markPaint);
    }
    canvas.restore();
  }
  canvas.restore();
}

/**
 * A water drop acts like a tiny lens: it shows an upside-down, shrunken view of what's behind it.
 * We clip to the drop's shape and draw the city flipped and scaled around the drop's centre.
 */
function drawDrop(
  canvas: SkCanvas,
  kit: RenderKit,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotationDegrees: number,
) {
  'worklet';
  const { assets, spriteSource, paints } = kit;
  const shadowRadiusX = radiusX * DROP_LOOK.shadowScale;
  const shadowRadiusY = radiusY * DROP_LOOK.shadowScale;
  canvas.drawImageRectOptions(
    assets.dropShadow,
    spriteSource,
    {
      x: x - shadowRadiusX + radiusX * DROP_LOOK.shadowOffsetX,
      y: y - shadowRadiusY + radiusY * DROP_LOOK.shadowOffsetY,
      width: shadowRadiusX * 2,
      height: shadowRadiusY * 2,
    },
    kit.filterMode,
    kit.mipmapMode,
    paints.sprite,
  );

  const dropRect = { x: -radiusX, y: -radiusY, width: radiusX * 2, height: radiusY * 2 };
  canvas.save();
  canvas.translate(x, y);
  canvas.rotate(rotationDegrees, 0, 0);

  if (Math.min(radiusX, radiusY) >= DROPLETS.tinyRadius) {
    canvas.save();
    canvas.clipRRect({ rect: dropRect, rx: radiusX, ry: radiusY }, kit.clipOp, true);
    // Undo the rotation so the view through the drop stays upright (well, upside-down).
    canvas.rotate(-rotationDegrees, 0, 0);
    canvas.scale(-1 / DROPLETS.refractionZoom, -1 / DROPLETS.refractionZoom);
    canvas.translate(-x, -y);
    drawImageFull(canvas, kit, assets.clearScene, kit.sceneSource, paints.image);
    canvas.restore();
  }

  canvas.drawImageRectOptions(
    assets.dropOverlay,
    spriteSource,
    dropRect,
    kit.filterMode,
    kit.mipmapMode,
    paints.sprite,
  );
  canvas.restore();
}

function drawLightning(canvas: SkCanvas, state: SimulationState, kit: RenderKit) {
  'worklet';
  const intensity = lightningIntensity(state);
  if (intensity <= 0) {
    return;
  }
  kit.paints.flash.setAlphaf(intensity * LIGHTNING.maxAlpha);
  canvas.drawRect(kit.screenRect, kit.paints.flash);
}

export function drawFrame(canvas: SkCanvas, state: SimulationState, kit: RenderKit) {
  'worklet';
  drawImageFull(canvas, kit, kit.assets.clearScene, kit.sceneSource, kit.paints.image);
  drawRain(canvas, state, kit);
  drawFog(canvas, state, kit);

  for (const droplet of state.droplets) {
    const grow = Math.min(1, (state.time - droplet.bornAt) / DROPLETS.growTime);
    const r = droplet.r * grow;
    drawDrop(canvas, kit, droplet.x, droplet.y, r, r, 0);
  }
  for (const runner of state.runners) {
    // Runners stretch along their direction of travel; the sprite's long axis is vertical.
    const rotation = (runner.heading - STRAIGHT_DOWN) * DEGREES_PER_RADIAN;
    drawDrop(canvas, kit, runner.x, runner.y, runner.r * RUNNERS.squash, runner.r * RUNNERS.stretch, rotation);
  }

  drawLightning(canvas, state, kit);
}
