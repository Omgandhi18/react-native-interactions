import type { Interaction } from '../types';
import { SpringTap } from './SpringTap';

export const interaction: Interaction = {
  slug: 'spring-tap',
  title: 'Spring Tap (starter example)',
  description: 'The pattern every interaction follows: gesture, shared value, spring, haptic.',
  createdAt: '2026-11-14',
  Component: SpringTap,
};
