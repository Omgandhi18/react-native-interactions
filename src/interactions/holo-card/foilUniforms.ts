import { LIGHT } from './constants';
import type { FoilStyle } from './designs/types';
import type { CardLayout } from './layout';

export function clampUnit(value: number): number {
  'worklet';
  return Math.max(-1, Math.min(1, value));
}

/** Uniforms for the foil shader: where the card is, how it's tilted, and the face's foil style. */
export function foilUniforms(layout: CardLayout, style: FoilStyle, tiltX: number, tiltY: number) {
  'worklet';
  return {
    size: [layout.width, layout.height],
    offset: [layout.x, layout.y],
    tilt: [tiltX, tiltY],
    bandShift: [LIGHT.bandShift[0], LIGHT.bandShift[1]],
    sheen: style.sheen,
    bandWidth: style.bandWidth,
    hueSpread: style.hueSpread,
    glitter: style.glitter,
    glare: style.glare,
  };
}
