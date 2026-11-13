// Builds the images the Monsoon window draws every frame: the city behind the glass,
// a fogged-up copy of it, and the sprites that make a drop look like water.
// Runs once on the JS thread when the screen opens; everything is generated, no image files.
import { BlendMode, BlurStyle, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkImage, SkRect } from '@shopify/react-native-skia';

import {
  BOKEH,
  DROP_LOOK,
  FOG,
  LIGHT_ROWS,
  SCENE,
  SKY,
  SKYLINE_LAYERS,
  STREET,
  WINDOW_COLORS,
} from './constants';
import { createSeededRandom, type SeededRandom } from './seededRandom';

export type SceneAssets = {
  clearScene: SkImage;
  foggedScene: SkImage;
  dropOverlay: SkImage;
  dropShadow: SkImage;
};

type SkylineLayer = (typeof SKYLINE_LAYERS)[number];
type LightRow = (typeof LIGHT_ROWS)[number];

export function createSceneAssets(width: number, height: number, pixelRatio: number): SceneAssets {
  const random = createSeededRandom(SCENE.seed);
  const scale = pixelRatio * SCENE.resolution;

  const clearScene = renderToImage(width, height, scale, (canvas) =>
    drawCity(canvas, width, height, random),
  );
  const foggedScene = renderToImage(width, height, scale, (canvas) =>
    drawFoggedCity(canvas, clearScene, width, height, random),
  );

  return {
    clearScene,
    foggedScene,
    dropOverlay: renderSprite(drawDropOverlay),
    dropShadow: renderSprite(drawDropShadow),
  };
}

export function imageBounds(image: SkImage): SkRect {
  return Skia.XYWHRect(0, 0, image.width(), image.height());
}

function renderToImage(
  width: number,
  height: number,
  scale: number,
  draw: (canvas: SkCanvas) => void,
): SkImage {
  const surface = Skia.Surface.Make(Math.ceil(width * scale), Math.ceil(height * scale));
  if (!surface) {
    throw new Error('Monsoon window: could not create an offscreen surface');
  }
  const canvas = surface.getCanvas();
  canvas.scale(scale, scale);
  draw(canvas);
  surface.flush();
  return surface.makeImageSnapshot();
}

function renderSprite(draw: (canvas: SkCanvas, size: number) => void): SkImage {
  const size = DROP_LOOK.spriteSize;
  return renderToImage(size, size, 1, (canvas) => draw(canvas, size));
}

function colorPaint(color: string) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(color));
  return paint;
}

// ---- The city ----

function drawCity(canvas: SkCanvas, width: number, height: number, random: SeededRandom) {
  const outOfFocus = Skia.Paint();
  outOfFocus.setImageFilter(
    Skia.ImageFilter.MakeBlur(SCENE.depthOfFieldBlur, SCENE.depthOfFieldBlur, TileMode.Clamp, null),
  );

  canvas.saveLayer(outOfFocus);
  drawSky(canvas, width, height);
  SKYLINE_LAYERS.forEach((layer) => drawSkyline(canvas, layer, width, height, random));
  canvas.drawRect(
    Skia.XYWHRect(0, height * STREET.top, width, height * (1 - STREET.top)),
    colorPaint(STREET.color),
  );
  drawBokeh(canvas, width, height, random);
  LIGHT_ROWS.forEach((row) => drawLightRow(canvas, row, width, height));
  canvas.restore();
}

function drawSky(canvas: SkCanvas, width: number, height: number) {
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
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), sky);

  const haze = Skia.Paint();
  haze.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(width / 2, height * SKY.hazeCenterY),
      height * SKY.hazeRadius,
      SKY.hazeColors.map((color) => Skia.Color(color)),
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawRect(Skia.XYWHRect(0, 0, width, height), haze);
}

function drawSkyline(
  canvas: SkCanvas,
  layer: SkylineLayer,
  width: number,
  height: number,
  random: SeededRandom,
) {
  const buildingPaint = colorPaint(layer.color);
  const windowPaint = Skia.Paint();
  const windowColors = WINDOW_COLORS.map((color) => Skia.Color(color));
  const baseline = height * layer.baseline;

  let x = -random.range(0, layer.maxWidth);
  while (x < width) {
    const buildingWidth = random.range(layer.minWidth, layer.maxWidth);
    const top = baseline - height * random.range(layer.minHeight, layer.maxHeight);
    canvas.drawRect(Skia.XYWHRect(x, top, buildingWidth, height - top), buildingPaint);

    const { window } = layer;
    for (let wy = top + window.inset; wy + window.height < baseline - window.inset; wy += window.height + window.gapY) {
      for (let wx = x + window.inset; wx + window.width < x + buildingWidth - window.inset; wx += window.width + window.gapX) {
        if (random.next() < window.litChance) {
          windowPaint.setColor(random.pick(windowColors));
          canvas.drawRect(Skia.XYWHRect(wx, wy, window.width, window.height), windowPaint);
        }
      }
    }
    x += buildingWidth + random.range(0, layer.maxGap);
  }
}

/** Out-of-focus lights: windows, signs and cars, blurred into discs by the lens. */
function drawBokeh(canvas: SkCanvas, width: number, height: number, random: SeededRandom) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setBlendMode(BlendMode.Screen);

  for (let i = 0; i < BOKEH.count; i++) {
    const radius = BOKEH.minRadius + (BOKEH.maxRadius - BOKEH.minRadius) * random.next() ** BOKEH.sizeBias;
    const x = random.range(-radius, width + radius);
    const y = height * random.range(BOKEH.minY, BOKEH.maxY);
    paint.setColor(Skia.Color(random.pick(BOKEH.colors)));
    paint.setAlphaf(random.range(BOKEH.minAlpha, BOKEH.maxAlpha));
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, radius * BOKEH.softness, true));
    canvas.drawCircle(x, y, radius, paint);
  }
}

function drawLightRow(canvas: SkCanvas, row: LightRow, width: number, height: number) {
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setBlendMode(BlendMode.Screen);
  paint.setColor(Skia.Color(row.color));
  paint.setAlphaf(row.alpha);

  for (let i = 0; i < row.count; i++) {
    const t = i / (row.count - 1);
    const radius = row.nearRadius + (row.farRadius - row.nearRadius) * t;
    const x = width * (row.from.x + (row.to.x - row.from.x) * t);
    const y = height * (row.from.y + (row.to.y - row.from.y) * t);
    paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, radius * BOKEH.softness, true));
    canvas.drawCircle(x, y, radius, paint);
  }
}

// ---- Fog ----

function drawFoggedCity(
  canvas: SkCanvas,
  clearScene: SkImage,
  width: number,
  height: number,
  random: SeededRandom,
) {
  const screen = Skia.XYWHRect(0, 0, width, height);
  const diffused = Skia.Paint();
  diffused.setImageFilter(Skia.ImageFilter.MakeBlur(FOG.blur, FOG.blur, TileMode.Clamp, null));
  diffused.setColorFilter(Skia.ColorFilter.MakeMatrix([...FOG.colorMatrix]));
  canvas.drawImageRect(clearScene, imageBounds(clearScene), screen, diffused);
  canvas.drawRect(screen, colorPaint(FOG.veilColor));

  const grain = colorPaint(FOG.grainColor);
  for (let i = 0; i < FOG.grainCount; i++) {
    grain.setAlphaf(random.range(FOG.grainMinAlpha, FOG.grainMaxAlpha));
    canvas.drawCircle(
      random.range(0, width),
      random.range(0, height),
      random.range(FOG.grainMinRadius, FOG.grainMaxRadius),
      grain,
    );
  }
}

// ---- Drop sprites ----

/** Dark rim, light gathering at the bottom, and a highlight: drawn on top of each drop. */
function drawDropOverlay(canvas: SkCanvas, size: number) {
  const center = size / 2;
  const radius = size / 2;

  const rim = Skia.Paint();
  rim.setAntiAlias(true);
  rim.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(center, center),
      radius,
      DROP_LOOK.rimColors.map((color) => Skia.Color(color)),
      [...DROP_LOOK.rimStops],
      TileMode.Clamp,
    ),
  );
  canvas.drawCircle(center, center, radius, rim);

  const causticY = center + radius * DROP_LOOK.causticOffsetY;
  const causticRadius = radius * DROP_LOOK.causticRadius;
  const caustic = Skia.Paint();
  caustic.setAntiAlias(true);
  caustic.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(center, causticY),
      causticRadius,
      DROP_LOOK.causticColors.map((color) => Skia.Color(color)),
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawCircle(center, causticY, causticRadius, caustic);

  const highlight = colorPaint(DROP_LOOK.highlightColor);
  highlight.setAlphaf(DROP_LOOK.highlightAlpha);
  highlight.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, radius * DROP_LOOK.highlightBlur, true));
  const highlightRect = Skia.XYWHRect(
    center + radius * DROP_LOOK.highlightX,
    center + radius * DROP_LOOK.highlightY,
    radius * DROP_LOOK.highlightWidth,
    radius * DROP_LOOK.highlightHeight,
  );
  canvas.save();
  canvas.rotate(
    DROP_LOOK.highlightRotation,
    highlightRect.x + highlightRect.width / 2,
    highlightRect.y + highlightRect.height / 2,
  );
  canvas.drawOval(highlightRect, highlight);
  canvas.restore();

  highlight.setAlphaf(DROP_LOOK.glintAlpha);
  canvas.drawCircle(
    center + radius * DROP_LOOK.glintX,
    center + radius * DROP_LOOK.glintY,
    radius * DROP_LOOK.glintRadius,
    highlight,
  );
}

function drawDropShadow(canvas: SkCanvas, size: number) {
  const center = size / 2;
  const shadow = Skia.Paint();
  shadow.setAntiAlias(true);
  shadow.setShader(
    Skia.Shader.MakeRadialGradient(
      vec(center, center),
      size / 2,
      DROP_LOOK.shadowColors.map((color) => Skia.Color(color)),
      null,
      TileMode.Clamp,
    ),
  );
  canvas.drawCircle(center, center, size / 2, shadow);
}
