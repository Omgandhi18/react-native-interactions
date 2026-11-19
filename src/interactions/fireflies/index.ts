import type { Interaction } from '../types';
import { Fireflies } from './Fireflies';

export const interaction: Interaction = {
  slug: 'fireflies',
  title: 'Fireflies',
  description:
    'Tap the jar and 300 fireflies drift out over a night meadow. They blink at random, then slowly fall into step until the whole meadow flashes together. Tap again to scatter their rhythm.',
  createdAt: '2026-11-19',
  fullScreen: true,
  Component: Fireflies,
};
