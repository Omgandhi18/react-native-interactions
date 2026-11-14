import type { Interaction } from '../types';
import { prismCardDesign } from './designs/credit-card';
import { HoloCard } from './HoloCard';

function PrismCard() {
  return <HoloCard design={prismCardDesign} />;
}

export const interaction: Interaction = {
  slug: 'holo-card',
  title: 'Holo Card',
  description: 'A holographic metal card: tilt or drag it to catch the light, tap to flip it over.',
  createdAt: '2026-11-14',
  fullScreen: true,
  Component: PrismCard,
};
