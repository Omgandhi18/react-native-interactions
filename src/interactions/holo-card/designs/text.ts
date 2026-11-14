// Fonts and text helpers for drawing card artwork.
import { matchFont } from '@shopify/react-native-skia';
import type { SkCanvas, SkFont, SkPaint } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

/** System fonts available on both platforms, so no font files need bundling. */
const FAMILIES = {
  sans: Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  serif: Platform.select({ ios: 'Georgia', default: 'serif' }),
} as const;

type FontKind = 'sans' | 'sansBold' | 'mono' | 'serifItalic';

export function cardFont(kind: FontKind, size: number): SkFont {
  switch (kind) {
    case 'sans':
      return matchFont({ fontFamily: FAMILIES.sans, fontSize: size });
    case 'sansBold':
      return matchFont({ fontFamily: FAMILIES.sans, fontSize: size, fontWeight: 'bold' });
    case 'mono':
      return matchFont({ fontFamily: FAMILIES.mono, fontSize: size });
    case 'serifItalic':
      return matchFont({ fontFamily: FAMILIES.serif, fontSize: size, fontStyle: 'italic' });
  }
}

/** Draws text with extra space between letters (Skia has no letter-spacing). Returns the width drawn. */
export function drawTrackedText(
  canvas: SkCanvas,
  text: string,
  x: number,
  baseline: number,
  font: SkFont,
  paint: SkPaint,
  tracking: number,
): number {
  let cursor = x;
  for (const character of text) {
    canvas.drawText(character, cursor, baseline, paint, font);
    cursor += font.getTextWidth(character) + tracking;
  }
  return cursor - x - tracking;
}
