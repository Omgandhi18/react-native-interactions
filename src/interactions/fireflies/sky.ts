// The living sky, drawn each frame between the baked sky and the treeline: stars that twinkle,
// more near the horizon where their light crosses more air, and now and then a shooting star.
import { Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

import type { SeededRandom } from '@/shared/seededRandom';
import { renderToImage, withAlpha } from '@/shared/skia';

import type { AtlasBuffers, SpriteAtlas } from './atlas';
import { SMOOTH, stripCells } from './atlas';
import { METEOR, MILKY_WAY, STAR_SPRITE, STARS, TWINKLE } from './constants';

const DEGREES_TO_RADIANS = Math.PI / 180;
const HALF = 0.5;

/** The Milky Way's centre, the unit vector along it, and its half-width, in dp. */
export function milkyWayFrame(width: number, height: number) {
  const angle = MILKY_WAY.angle * DEGREES_TO_RADIANS;
  return {
    centerX: width * MILKY_WAY.centerX,
    centerY: height * MILKY_WAY.centerY,
    alongX: Math.cos(angle),
    alongY: Math.sin(angle),
    halfWidth: height * MILKY_WAY.halfWidth,
  };
}

export type StarField = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  /** Core radius, in dp. */
  radius: Float32Array;
  /** Brightness with no twinkle, from 0 to 1. */
  light: Float32Array;
  /** Index into STARS.colors. */
  color: Uint8Array;
  /** How much of its light the flicker can take away. */
  twinkle: Float32Array;
  speedA: Float32Array;
  speedB: Float32Array;
  phaseA: Float32Array;
  phaseB: Float32Array;
  atlas: SpriteAtlas;
};

function createStarAtlas(): SpriteAtlas {
  const { levels, size } = STAR_SPRITE;
  const radius = size / 2;
  const sprites = stripCells(STARS.colors.length * levels, size, size);
  const image = renderToImage(sprites.length * size, size, 1, (canvas) => {
    STARS.colors.forEach((color, c) => {
      for (let level = 1; level < levels; level++) {
        const strength = level / (levels - 1);
        const center = vec((c * levels + level) * size + radius, radius);
        const paint = Skia.Paint();
        paint.setShader(
          Skia.Shader.MakeRadialGradient(
            center,
            radius,
            STAR_SPRITE.alphas.map((alpha) => withAlpha(color, alpha * strength)),
            [...STAR_SPRITE.positions],
            TileMode.Clamp,
          ),
        );
        canvas.drawCircle(center.x, center.y, radius, paint);
      }
    });
  });
  return { image, sprites };
}

export function createStarField(width: number, height: number, random: SeededRandom): StarField {
  const total = STARS.count + STARS.bright;
  const floats = () => new Float32Array(total);
  const stars: StarField = {
    count: 0,
    x: floats(),
    y: floats(),
    radius: floats(),
    light: floats(),
    color: new Uint8Array(total),
    twinkle: floats(),
    speedA: floats(),
    speedB: floats(),
    phaseA: floats(),
    phaseB: floats(),
    atlas: createStarAtlas(),
  };
  const band = milkyWayFrame(width, height);
  const reach = Math.hypot(width, height);
  const horizon = height * STARS.bottom;

  for (let i = 0; i < total; i++) {
    const bright = i >= STARS.count;
    let x: number;
    let y: number;
    if (bright || random.next() >= STARS.inBand) {
      x = random.next() * width;
      y = random.next() * horizon;
    } else {
      // Along the Milky Way, bunched toward its middle.
      const along = random.range(-1, 1) * reach;
      const across = (random.next() + random.next() - 1) * band.halfWidth;
      x = band.centerX + band.alongX * along - band.alongY * across;
      y = band.centerY + band.alongY * along + band.alongX * across;
    }
    const color = Math.floor(random.next() * STARS.colors.length);
    const light = bright ? STARS.maxAlpha : random.range(STARS.minAlpha, STARS.maxAlpha);
    const radius = bright ? STARS.brightRadius : random.range(STARS.minRadius, STARS.maxRadius);
    const speedA = random.range(TWINKLE.minSpeed, TWINKLE.maxSpeed);
    const speedB = random.range(TWINKLE.minSpeed, TWINKLE.maxSpeed);
    const phaseA = random.next() * Math.PI * 2;
    const phaseB = random.next() * Math.PI * 2;
    if (x < 0 || x > width || y < 0 || y > horizon) {
      continue;
    }
    const n = stars.count++;
    const lowness = y / horizon;
    stars.x[n] = x;
    stars.y[n] = y;
    stars.radius[n] = radius;
    // Stars fade into the haze toward the horizon, and twinkle more there.
    stars.light[n] = light * (1 - lowness ** 3);
    stars.color[n] = color;
    stars.twinkle[n] = TWINKLE.overhead + (TWINKLE.horizon - TWINKLE.overhead) * lowness * lowness;
    stars.speedA[n] = speedA;
    stars.speedB[n] = speedB;
    stars.phaseA[n] = phaseA;
    stars.phaseB[n] = phaseB;
  }
  return stars;
}

/** `buffers` must hold exactly `stars.count` entries. */
export function drawStars(canvas: SkCanvas, stars: StarField, buffers: AtlasBuffers, time: number, paint: SkPaint) {
  'worklet';
  const { sprites, transforms } = buffers;
  const { levels, size } = STAR_SPRITE;
  const half = size / 2;
  const brightest = levels - 1;
  for (let i = 0; i < stars.count; i++) {
    const flicker =
      (HALF + HALF * Math.sin(stars.speedA[i] * time + stars.phaseA[i])) * (HALF + HALF * Math.sin(stars.speedB[i] * time + stars.phaseB[i]));
    const light = stars.light[i] * (1 - stars.twinkle[i] * flicker);
    sprites[i] = stars.atlas.sprites[stars.color[i] * levels + Math.round(light * brightest)];
    const scale = stars.radius[i] / (STAR_SPRITE.core * half);
    transforms[i].set(scale, 0, stars.x[i] - half * scale, stars.y[i] - half * scale);
  }
  canvas.drawAtlas(stars.atlas.image, sprites, transforms, paint, undefined, undefined, SMOOTH);
}

/** A shooting star: when it started, where from, which way and how far, and when the next one comes. */
export type Meteor = {
  startedAt: number;
  nextAt: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  travel: number;
  /** Its colour's red, green and blue, from 0 to 1. */
  red: number;
  green: number;
  blue: number;
};

export function createMeteor(): Meteor {
  const [red, green, blue] = Skia.Color(METEOR.color);
  return { startedAt: -METEOR.duration, nextAt: METEOR.minGap, x: 0, y: 0, dirX: 1, dirY: 0, travel: 0, red, green, blue };
}

/** Launches the next shooting star when it's due. */
export function stepMeteor(meteor: Meteor, time: number, width: number, height: number) {
  'worklet';
  if (time < meteor.nextAt) {
    return;
  }
  const angle = (METEOR.minAngle + Math.random() * (METEOR.maxAngle - METEOR.minAngle)) * DEGREES_TO_RADIANS;
  const leftward = Math.random() < HALF;
  meteor.startedAt = time;
  meteor.x = Math.random() * width;
  meteor.y = (METEOR.top + Math.random() * (METEOR.bottom - METEOR.top)) * height;
  meteor.dirX = Math.cos(angle) * (leftward ? -1 : 1);
  meteor.dirY = Math.sin(angle);
  meteor.travel = METEOR.minTravel + Math.random() * (METEOR.maxTravel - METEOR.minTravel);
  meteor.nextAt = time + METEOR.duration + METEOR.minGap + Math.random() * (METEOR.maxGap - METEOR.minGap);
}

export function drawMeteor(canvas: SkCanvas, meteor: Meteor, time: number, paint: SkPaint) {
  'worklet';
  const age = (time - meteor.startedAt) / METEOR.duration;
  if (age < 0 || age > 1) {
    return;
  }
  const headX = meteor.x + meteor.dirX * meteor.travel * age;
  const headY = meteor.y + meteor.dirY * meteor.travel * age;
  // It flares up, then burns out.
  const flare = Math.sin(Math.PI * age);
  // The streak, head to tail, in short pieces that fade and thin toward the tail.
  for (let k = 0; k < METEOR.segments; k++) {
    const near = k / METEOR.segments;
    const far = (k + 1) / METEOR.segments;
    paint.setColor(Float32Array.of(meteor.red, meteor.green, meteor.blue, flare * (1 - near)));
    paint.setStrokeWidth(METEOR.width * (1 - near * METEOR.taper));
    canvas.drawLine(
      headX - meteor.dirX * METEOR.tail * near,
      headY - meteor.dirY * METEOR.tail * near,
      headX - meteor.dirX * METEOR.tail * far,
      headY - meteor.dirY * METEOR.tail * far,
      paint,
    );
  }
}
