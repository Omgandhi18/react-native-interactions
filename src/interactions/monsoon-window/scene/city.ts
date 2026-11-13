// The city behind the glass, drawn sharp: it's what you see when the fog is wiped away.
// Returns every light it drew, so the fog can bloom them into soft glows.
import { BlurStyle, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import { lerp } from '../math';
import type { SeededRandom } from '../seededRandom';
import {
  AVIATION_LIGHT,
  CAR_LANES,
  CAR_LIGHTS,
  LAMP,
  LAMP_ROWS,
  NEON_SIGNS,
  REFLECTIONS,
  ROAD,
  SCENE,
  SKY,
  SKYLINE_LAYERS,
  WINDOWS,
} from './constants';
import { colorPaint, drawGlow, drawReflection, withAlpha, type LightSource } from './drawing';

type SkylineLayer = (typeof SKYLINE_LAYERS)[number];
type ScreenLine = { from: { x: number; y: number }; to: { x: number; y: number } };

export function drawCity(canvas: SkCanvas, width: number, height: number, random: SeededRandom): LightSource[] {
  const lights: LightSource[] = [];
  const antiShimmer = Skia.Paint();
  antiShimmer.setImageFilter(
    Skia.ImageFilter.MakeBlur(SCENE.antiShimmerBlur, SCENE.antiShimmerBlur, TileMode.Clamp, null),
  );

  canvas.saveLayer(antiShimmer);
  drawSky(canvas, width, height);
  SKYLINE_LAYERS.forEach((layer) => drawSkyline(canvas, layer, width, height, random, lights));
  drawRoad(canvas, width, height);
  LAMP_ROWS.forEach((row) => drawLampRow(canvas, row, width, height, lights));
  CAR_LANES.forEach((lane) => drawCarLane(canvas, lane, width, height, random, lights));
  canvas.restore();

  return lights;
}

/** 1 for the nearest item in a row, 0 for the farthest, shrinking faster with distance like real perspective. */
function perspective(index: number, count: number): number {
  const farthest = 1 / (1 + (count - 1) * SCENE.perspectiveStep);
  const value = 1 / (1 + index * SCENE.perspectiveStep);
  return (value - farthest) / (1 - farthest);
}

/** Point along a line on screen: depth 1 is its `from` end (near), 0 its `to` end (far). */
function pointAtDepth(line: ScreenLine, depth: number, width: number, height: number) {
  return {
    x: lerp(line.to.x, line.from.x, depth) * width,
    y: lerp(line.to.y, line.from.y, depth) * height,
  };
}

// ---- Sky and buildings ----

function drawSky(canvas: SkCanvas, width: number, height: number) {
  const screen = Skia.XYWHRect(0, 0, width, height);
  const sky = Skia.Paint();
  sky.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(0, 0),
      vec(0, height),
      SKY.colors.map((color) => Skia.Color(color)),
      [...SKY.stops],
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(screen, sky);
  drawGlow(canvas, width / 2, height * SKY.hazeCenterY, height * SKY.hazeRadius, SKY.hazeColor, SKY.hazeAlpha);
}

function drawSkyline(
  canvas: SkCanvas,
  layer: SkylineLayer,
  width: number,
  height: number,
  random: SeededRandom,
  lights: LightSource[],
) {
  const buildingPaint = colorPaint(layer.color);
  const baseline = height * layer.baseline;

  let x = -random.range(0, layer.maxWidth);
  while (x < width) {
    const buildingWidth = random.range(layer.minWidth, layer.maxWidth);
    const buildingHeight = height * random.range(layer.minHeight, layer.maxHeight);
    const top = baseline - buildingHeight;
    canvas.drawRect(Skia.XYWHRect(x, top, buildingWidth, height - top), buildingPaint);
    drawWindows(canvas, layer, x, top, buildingWidth, baseline, random, lights);

    if (layer.hasAviationLights && buildingHeight > height * AVIATION_LIGHT.minBuildingHeight) {
      drawAviationLight(canvas, x + buildingWidth / 2, top, lights);
    }
    if (random.next() < layer.signChance) {
      drawNeonSign(canvas, x, top, buildingWidth, baseline, random, lights);
    }
    x += buildingWidth + random.range(0, layer.maxGap);
  }
}

function drawWindows(
  canvas: SkCanvas,
  layer: SkylineLayer,
  left: number,
  top: number,
  buildingWidth: number,
  baseline: number,
  random: SeededRandom,
  lights: LightSource[],
) {
  const { window } = layer;
  const paint = Skia.Paint();
  for (let y = top + window.inset; y + window.height < baseline - window.inset; y += window.height + window.gapY) {
    for (let x = left + window.inset; x + window.width < left + buildingWidth - window.inset; x += window.width + window.gapX) {
      if (random.next() >= window.litChance) {
        continue;
      }
      const color = random.pick(WINDOWS.colors);
      paint.setColor(withAlpha(color, WINDOWS.alpha));
      canvas.drawRect(Skia.XYWHRect(x, y, window.width, window.height), paint);
      if (random.next() < WINDOWS.glowChance) {
        lights.push({
          x: x + window.width / 2,
          y: y + window.height / 2,
          radius: WINDOWS.glowRadius,
          color,
          intensity: WINDOWS.glowIntensity,
        });
      }
    }
  }
}

function drawAviationLight(canvas: SkCanvas, x: number, y: number, lights: LightSource[]) {
  drawGlow(canvas, x, y, AVIATION_LIGHT.haloRadius, AVIATION_LIGHT.color, AVIATION_LIGHT.haloAlpha);
  canvas.drawCircle(x, y, AVIATION_LIGHT.radius, colorPaint(AVIATION_LIGHT.color));
  lights.push({
    x,
    y,
    radius: AVIATION_LIGHT.radius,
    color: AVIATION_LIGHT.color,
    intensity: AVIATION_LIGHT.intensity,
  });
}

function drawNeonSign(
  canvas: SkCanvas,
  buildingLeft: number,
  buildingTop: number,
  buildingWidth: number,
  baseline: number,
  random: SeededRandom,
  lights: LightSource[],
) {
  const signWidth = Math.min(
    buildingWidth * NEON_SIGNS.maxBuildingShare,
    random.range(NEON_SIGNS.minWidth, NEON_SIGNS.maxWidth),
  );
  const signHeight = random.range(NEON_SIGNS.minHeight, NEON_SIGNS.maxHeight);
  const highest = buildingTop + NEON_SIGNS.topMargin;
  const lowest = baseline - NEON_SIGNS.bottomMargin - signHeight;
  if (lowest <= highest) {
    return;
  }

  const color = random.pick(NEON_SIGNS.colors);
  const rect = Skia.XYWHRect(
    buildingLeft + (buildingWidth - signWidth) / 2,
    random.range(highest, lowest),
    signWidth,
    signHeight,
  );
  const rrect = Skia.RRectXY(rect, NEON_SIGNS.cornerRadius, NEON_SIGNS.cornerRadius);

  const glow = colorPaint(color, NEON_SIGNS.glowAlpha);
  glow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, NEON_SIGNS.glowBlur, true));
  canvas.drawRRect(rrect, glow);
  canvas.drawRRect(rrect, colorPaint(color, NEON_SIGNS.bodyAlpha));

  lights.push({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    radius: rect.width / 2,
    color,
    intensity: NEON_SIGNS.intensity,
  });
}

// ---- Street level ----

function drawRoad(canvas: SkCanvas, width: number, height: number) {
  const horizonY = height * ROAD.vanishingPoint.y;
  const halfWidth = width * ROAD.horizonHalfWidth;
  const road = Skia.PathBuilder.Make()
    .moveTo(width * ROAD.vanishingPoint.x - halfWidth, horizonY)
    .lineTo(width * ROAD.vanishingPoint.x + halfWidth, horizonY)
    .lineTo(width * ROAD.bottomRightX, height)
    .lineTo(width * ROAD.bottomLeftX, height)
    .close()
    .build();

  canvas.drawPath(road, colorPaint(ROAD.color));

  const sheen = Skia.Paint();
  sheen.setAntiAlias(true);
  sheen.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(0, horizonY),
      vec(0, height),
      [withAlpha(ROAD.sheenColor, ROAD.sheenAlpha), withAlpha(ROAD.sheenColor, 0)],
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawPath(road, sheen);
}

function drawLampRow(
  canvas: SkCanvas,
  row: (typeof LAMP_ROWS)[number],
  width: number,
  height: number,
  lights: LightSource[],
) {
  const polePaint = colorPaint(LAMP.poleColor);
  const headPaint = colorPaint(row.color);

  // Farthest first, so nearer lamps draw over them.
  for (let i = row.count - 1; i >= 0; i--) {
    const depth = perspective(i, row.count);
    const ground = pointAtDepth(row, depth, width, height);
    const headRadius = lerp(LAMP.farHeadRadius, LAMP.nearHeadRadius, depth);
    const poleHeight = lerp(LAMP.farPoleHeight, LAMP.nearPoleHeight, depth);
    const poleWidth = lerp(LAMP.farPoleWidth, LAMP.nearPoleWidth, depth);
    const headY = ground.y - poleHeight;

    drawReflection(
      canvas,
      ground.x,
      ground.y,
      headRadius * REFLECTIONS.widthScale,
      lerp(REFLECTIONS.farLength, REFLECTIONS.nearLength, depth),
      row.color,
      REFLECTIONS.alpha,
    );
    canvas.drawRect(Skia.XYWHRect(ground.x - poleWidth / 2, headY, poleWidth, poleHeight), polePaint);
    drawGlow(canvas, ground.x, headY, headRadius * LAMP.haloScale, row.color, LAMP.haloAlpha);
    canvas.drawCircle(ground.x, headY, headRadius, headPaint);
    lights.push({ x: ground.x, y: headY, radius: headRadius, color: row.color, intensity: LAMP.intensity });
  }
}

function drawCarLane(
  canvas: SkCanvas,
  lane: (typeof CAR_LANES)[number],
  width: number,
  height: number,
  random: SeededRandom,
  lights: LightSource[],
) {
  const lightPaint = colorPaint(lane.color);
  const depths = Array.from({ length: lane.count }, () =>
    random.range(CAR_LIGHTS.minDepth, CAR_LIGHTS.maxDepth),
  ).sort((a, b) => a - b);

  // Sorted far to near, so nearer cars draw over farther ones.
  for (const depth of depths) {
    const center = pointAtDepth(lane, depth, width, height);
    const radius = lerp(CAR_LIGHTS.farRadius, CAR_LIGHTS.nearRadius, depth);
    const halfSpacing = lerp(CAR_LIGHTS.farSpacing, CAR_LIGHTS.nearSpacing, depth) / 2;

    for (const x of [center.x - halfSpacing, center.x + halfSpacing]) {
      drawReflection(
        canvas,
        x,
        center.y,
        radius * REFLECTIONS.widthScale,
        lerp(REFLECTIONS.farLength, REFLECTIONS.nearLength, depth),
        lane.color,
        REFLECTIONS.alpha,
      );
      drawGlow(canvas, x, center.y, radius * CAR_LIGHTS.haloScale, lane.color, CAR_LIGHTS.haloAlpha);
      canvas.drawCircle(x, center.y, radius, lightPaint);
      lights.push({ x, y: center.y, radius, color: lane.color, intensity: CAR_LIGHTS.intensity });
    }
  }
}
