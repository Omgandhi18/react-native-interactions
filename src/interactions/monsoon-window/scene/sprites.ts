// Sprites drawn on every drop: a soft shadow under it, and a rim, caustic and highlight over it.
import { BlurStyle, Skia, TileMode, vec } from '@shopify/react-native-skia';
import type { SkCanvas } from '@shopify/react-native-skia';

import { DROP_LOOK } from '../constants';
import { colorPaint } from './drawing';

/** Dark rim, light gathering at the bottom, and a highlight. */
export function drawDropOverlay(canvas: SkCanvas, size: number) {
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

  const highlight = colorPaint(DROP_LOOK.highlightColor, DROP_LOOK.highlightAlpha);
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

export function drawDropShadow(canvas: SkCanvas, size: number) {
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
