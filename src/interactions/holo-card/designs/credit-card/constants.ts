/**
 * The look of the Prism card: an original metal credit card design, made up for this demo.
 * Positions and sizes are in card units: the card is 100 units wide (and about 158.6 tall).
 */

export const TEXT = {
  brand: 'PRISM',
  edition: 'MONSOON EDITION',
  holder: 'OM GANDHI',
  /** A made-up number, printed stacked on the back. */
  numberGroups: ['2026', '1114', '0000', '0007'],
  validLabel: 'VALID THRU',
  expiry: '11/31',
  cvvLabel: 'CVV',
  cvv: '777',
  signature: 'Om Gandhi',
  disclaimer: 'Design study · not a real card',
} as const;

export const SEED = 1114;

/** All positions below are in card units, with the card this many units wide. */
export const UNITS_WIDE = 100;

export const METAL = {
  colors: ['#2E323E', '#1A1D25', '#0D0F14'],
  positions: [0, 0.55, 1],
  /** Fine horizontal lines, like brushed metal. */
  brushLines: 700,
  brushColor: '#FFFFFF',
  brushMinAlpha: 0.012,
  brushMaxAlpha: 0.035,
  brushWidth: 0.25,
} as const;

export const INK = {
  silver: '#E6E8EE',
  muted: 'rgba(230, 232, 238, 0.55)',
  /** A dark copy drawn just below and right of embossed text, so it looks raised. */
  embossShadow: 'rgba(0, 0, 0, 0.65)',
  embossOffsetX: 0.35,
  embossOffsetY: 0.45,
} as const;

/** Fine wavy security lines, as on banknotes. They're the main holographic area on the front. */
export const GUILLOCHE = {
  lines: 28,
  centerY: 95,
  spacing: 1.6,
  amplitude: 7,
  /** Waves across the card's width. */
  frequency: 1.3,
  /** Each line's wave is shifted a little from the one above, which makes the woven pattern. */
  phaseStep: 0.22,
  points: 64,
  artColor: 'rgba(255, 255, 255, 0.07)',
  artWidth: 0.25,
  foilWidth: 0.35,
} as const;

export const FRONT = {
  brand: { x: 8, baseline: 16, size: 7, tracking: 1.6 },
  edition: { x: 8, baseline: 22, size: 2.6, tracking: 0.9 },
  chip: { x: 8, y: 34, width: 13, height: 17, radius: 2.2 },
  contactless: { x: 25, y: 42.5, firstRadius: 2.5, step: 1.3, arcs: 4, sweep: 100, width: 0.6 },
  gem: { x: 84, y: 143, radius: 7 },
  holder: { x: 8, baseline: 147, size: 4, tracking: 0.6 },
} as const;

export const BACK = {
  stripe: { y: 8, height: 14, color: '#07080B' },
  number: { x: 8, firstBaseline: 48, lineGap: 10, size: 7.5, tracking: 0.8 },
  label: { size: 2.3, tracking: 0.5 },
  value: { size: 4, tracking: 0.4 },
  expiry: { x: 8, labelBaseline: 92, valueBaseline: 98 },
  cvv: { x: 40, labelBaseline: 92, valueBaseline: 98 },
  holder: { x: 8, baseline: 110, size: 4, tracking: 0.6 },
  signature: {
    x: 8, y: 116, width: 58, height: 10, radius: 1,
    color: '#E9E6DE', hatchColor: 'rgba(120, 110, 95, 0.25)', hatchGap: 1.6, hatchWidth: 0.3,
    inkColor: '#1F2A5A', textX: 11, baseline: 123.5, size: 5,
  },
  hologram: {
    x: 70, y: 114, width: 22, height: 14, radius: 1.5,
    colors: ['#DDE2EA', '#AEB5C2', '#E8ECF2'], rings: 6, ringColor: 'rgba(255, 255, 255, 0.5)', ringWidth: 0.3,
  },
  disclaimer: { x: 8, baseline: 147, size: 2.2, tracking: 0.3 },
  gem: { x: 86, y: 145, radius: 4 },
} as const;

export const CHIP = {
  colors: ['#F6DFA2', '#D3A64B', '#A9782A', '#E9C46A'],
  positions: [0, 0.4, 0.75, 1],
  lineColor: 'rgba(90, 60, 15, 0.55)',
  lineWidth: 0.35,
  /** The contact pad's inner outline, inset from the chip's edge, with softer corners. */
  inset: 2.6,
  innerRadiusScale: 0.5,
} as const;

/** The Prism mark: a faceted gem. */
export const GEM = {
  color: '#E6E8EE',
  width: 0.5,
  /** Thicker in the foil mask, so the rainbow reads on such thin lines. */
  foilWidth: 1,
  sides: 6,
} as const;

/** How much of each face is holographic: 1 = full foil. */
export const FOIL_MASK = {
  frontBase: 0.35,
  backBase: 0.22,
  wordmark: 0.8,
  numbers: 0.65,
  full: 1,
  none: 0,
} as const;

export const FOIL_STYLE = {
  front: { sheen: 0.12, bandWidth: 0.16, hueSpread: 1.6, glitter: 0.15, glare: 0.22 },
  back: { sheen: 0.3, bandWidth: 0.2, hueSpread: 2.2, glitter: 0.6, glare: 0.18 },
} as const;
