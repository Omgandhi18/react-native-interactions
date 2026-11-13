import type { Interaction } from '../types';
import { MonsoonWindow } from './MonsoonWindow';

export const interaction: Interaction = {
  slug: 'monsoon-window',
  title: 'Monsoon Window',
  description: 'Wipe the fog off a rainy window, tilt to steer the drops, double-tap for lightning.',
  createdAt: '2026-11-14',
  fullScreen: true,
  Component: MonsoonWindow,
};
