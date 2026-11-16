import type { Interaction } from '../types';
import { Hourglass } from './Hourglass';

export const interaction: Interaction = {
  slug: 'hourglass',
  title: 'Hourglass',
  description: 'A 30-second glass of 7,200 grains that pour at the same rate whether the glass is full or nearly empty. Tap or turn your phone over to flip it.',
  createdAt: '2026-11-16',
  fullScreen: true,
  Component: Hourglass,
};
