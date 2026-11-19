// The jar's shape, worked out once from the screen size: where sleeping fireflies sit, where
// they leave from, and the glass itself, drawn with the details that make glass read as glass:
// a thick rim, threads on the neck, edges brighter where you look through more glass, soft
// highlights and a heavy base.
import { BlurStyle, PaintStyle, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas, SkPaint, SkPath } from '@shopify/react-native-skia';

import { colorPaint, withAlpha } from '@/shared/skia';

import { JAR } from './constants';

const HALF_TURN_DEGREES = 180;

export type JarLayout = {
  centerX: number;
  /** The open mouth at the top, where the neck meets the shoulders, and the base, in dp. */
  mouthY: number;
  neckBottomY: number;
  bottomY: number;
  halfWidth: number;
  neckHalfWidth: number;
  /** The part of the body that's full width: shoulders down to the base. */
  bodyTopY: number;
  cornerRadius: number;
};

export function createJarLayout(width: number, height: number): JarLayout {
  const halfWidth = (width * JAR.width) / 2;
  const jarHeight = height * JAR.height;
  const bottomY = height * JAR.bottom;
  const mouthY = bottomY - jarHeight;
  const neckBottomY = mouthY + jarHeight * JAR.neckHeight;
  return {
    centerX: width * JAR.centerX,
    mouthY,
    neckBottomY,
    bottomY,
    halfWidth,
    neckHalfWidth: halfWidth * JAR.neck,
    bodyTopY: neckBottomY + jarHeight * JAR.shoulder,
    cornerRadius: halfWidth * 2 * JAR.cornerRadius,
  };
}

/** The glass, closed across the mouth so it can be filled. */
export function jarPath(jar: JarLayout): SkPath {
  const { centerX, mouthY, neckBottomY, bottomY, halfWidth, neckHalfWidth, bodyTopY, cornerRadius } = jar;
  const left = centerX - halfWidth;
  const right = centerX + halfWidth;
  const path = Skia.PathBuilder.Make();
  path.moveTo(centerX - neckHalfWidth, mouthY);
  path.lineTo(centerX - neckHalfWidth, neckBottomY);
  path.quadTo(left, neckBottomY, left, bodyTopY);
  path.lineTo(left, bottomY - cornerRadius);
  path.quadTo(left, bottomY, left + cornerRadius, bottomY);
  path.lineTo(right - cornerRadius, bottomY);
  path.quadTo(right, bottomY, right, bottomY - cornerRadius);
  path.lineTo(right, bodyTopY);
  path.quadTo(right, neckBottomY, centerX + neckHalfWidth, neckBottomY);
  path.lineTo(centerX + neckHalfWidth, mouthY);
  path.close();
  return path.build();
}

/** The same jar, shrunk inward by `inset` dp all round: the inside face of the glass. */
function insetJar(jar: JarLayout, inset: number): JarLayout {
  return {
    ...jar,
    mouthY: jar.mouthY + inset,
    bottomY: jar.bottomY - inset,
    halfWidth: jar.halfWidth - inset,
    neckHalfWidth: jar.neckHalfWidth - inset,
    cornerRadius: Math.max(0, jar.cornerRadius - inset),
  };
}

function glassStroke(alpha: number, width: number): SkPaint {
  const paint = colorPaint(JAR.glassColor, alpha);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(width);
  return paint;
}

/** A soft vertical streak of light down the body, brightest along its middle. */
function drawHighlight(canvas: SkCanvas, jar: JarLayout, at: number, width: number, alpha: number) {
  const streakWidth = jar.halfWidth * width;
  const left = jar.centerX + jar.halfWidth * at - streakWidth / 2;
  const top = jar.bodyTopY + jar.cornerRadius;
  const bottom = jar.bottomY - jar.cornerRadius - JAR.baseThickness;
  const paint = Skia.Paint();
  paint.setShader(
    Skia.Shader.MakeLinearGradient(
      vec(left, 0),
      vec(left + streakWidth, 0),
      [withAlpha(JAR.glassColor, 0), withAlpha(JAR.glassColor, alpha), withAlpha(JAR.glassColor, 0)],
      null,
      TileMode.Clamp,
    ),
  );
  paint.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, JAR.highlightBlur, true));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(left, top, streakWidth, bottom - top), streakWidth / 2, streakWidth / 2), paint);
}

export function drawJar(canvas: SkCanvas, jar: JarLayout) {
  const { centerX, mouthY, neckBottomY, bottomY, halfWidth, neckHalfWidth } = jar;

  // A soft shadow where it stands.
  const shadow = colorPaint(JAR.shadowColor, JAR.shadowAlpha);
  shadow.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, JAR.shadowBlur, true));
  const shadowDepth = halfWidth * JAR.shadowDepth;
  const shadowHalfWidth = halfWidth * JAR.shadowSpread;
  canvas.drawOval(Skia.XYWHRect(centerX - shadowHalfWidth, bottomY - shadowDepth, shadowHalfWidth * 2, shadowDepth * 2), shadow);

  const glass = jarPath(jar);
  canvas.drawPath(glass, colorPaint(JAR.glassColor, JAR.glassAlpha));
  canvas.drawPath(jarPath(insetJar(jar, JAR.innerEdgeInset)), glassStroke(JAR.innerEdgeAlpha, JAR.innerEdgeWidth));
  canvas.drawPath(glass, glassStroke(JAR.edgeAlpha, JAR.edgeWidth));

  JAR.highlights.forEach(({ at, width, alpha }) => drawHighlight(canvas, jar, at, width, alpha));

  // The thick base: the inside floor of the glass, seen as a curve a little above the bottom.
  const baseDepth = halfWidth * JAR.rimDepth;
  const floorY = bottomY - JAR.baseThickness;
  canvas.drawArc(
    Skia.XYWHRect(centerX - halfWidth + JAR.innerEdgeInset, floorY - baseDepth, (halfWidth - JAR.innerEdgeInset) * 2, baseDepth * 2),
    0,
    HALF_TURN_DEGREES,
    false,
    glassStroke(JAR.baseAlpha, JAR.edgeWidth * 2),
  );

  // Screw threads around the neck: the front half of a ring at each.
  const ringDepth = neckHalfWidth * JAR.rimDepth;
  const threads = glassStroke(JAR.threadAlpha, JAR.edgeWidth);
  for (let k = 1; k <= JAR.threads; k++) {
    const y = mouthY + ((neckBottomY - mouthY) * k) / (JAR.threads + 1);
    canvas.drawArc(Skia.XYWHRect(centerX - neckHalfWidth, y - ringDepth, neckHalfWidth * 2, ringDepth * 2), 0, HALF_TURN_DEGREES, false, threads);
  }

  // The rim: an outer and an inner ellipse, the thickness of the glass apart.
  const rim = (inset: number, alpha: number) =>
    canvas.drawOval(
      Skia.XYWHRect(centerX - neckHalfWidth + inset, mouthY - ringDepth + inset / 2, (neckHalfWidth - inset) * 2, (ringDepth - inset / 2) * 2),
      glassStroke(alpha, JAR.edgeWidth),
    );
  rim(0, JAR.rimAlpha);
  rim(JAR.rimThickness, JAR.innerRimAlpha);
}
