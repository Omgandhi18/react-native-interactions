// `pnpm new <slug> "<Title>"` adds an import and an entry above the markers below.
import { interaction as monsoonWindow } from './monsoon-window';
import { interaction as holoCard } from './holo-card';
import { interaction as marbleDust } from './marble-dust';
import { interaction as hourglass } from './hourglass';
import { interaction as murmuration } from './murmuration';
// @new-interaction:imports
import type { Interaction } from './types';

const interactions: readonly Interaction[] = [
  monsoonWindow,
  holoCard,
  marbleDust,
  hourglass,
  murmuration,
  // @new-interaction:entries
];

// Reversed first so that, on the same date, the most recently added interaction comes first.
export const interactionsNewestFirst: readonly Interaction[] = [...interactions]
  .reverse()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function findInteraction(slug: string | undefined): Interaction | undefined {
  return interactions.find((interaction) => interaction.slug === slug);
}
