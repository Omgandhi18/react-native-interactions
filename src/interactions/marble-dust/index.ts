import type { Interaction } from '../types';
import { MarbleDust } from './MarbleDust';

export const interaction: Interaction = {
  slug: 'marble-dust',
  title: 'Marble Dust',
  description: "Michelangelo's David in 12,000 grains of marble: swipe to scatter them, tap to shatter him.",
  createdAt: '2026-11-16',
  fullScreen: true,
  Component: MarbleDust,
};
