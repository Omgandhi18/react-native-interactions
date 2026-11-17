import type { Interaction } from '../types';
import { Murmuration } from './Murmuration';

export const interaction: Interaction = {
  slug: 'murmuration',
  title: 'Murmuration',
  description:
    'Thousands of starlings swirl over a dusk sky, each one steering by its seven nearest neighbours. Drag through them: your finger is a falcon, and the flock splits around it.',
  createdAt: '2026-11-17',
  fullScreen: true,
  Component: Murmuration,
};
