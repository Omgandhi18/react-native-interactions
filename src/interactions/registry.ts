// `pnpm new <slug> "<Title>"` adds an import and an entry above the markers below.
import { interaction as monsoonWindow } from './monsoon-window';
import { interaction as holoCard } from './holo-card';
// @new-interaction:imports
import type { Interaction } from './types';

const interactions: readonly Interaction[] = [
  monsoonWindow,
  holoCard,
  // @new-interaction:entries
];

// Reversed first so that, on the same date, the most recently added interaction comes first.
export const interactionsNewestFirst: readonly Interaction[] = [...interactions]
  .reverse()
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function findInteraction(slug: string | undefined): Interaction | undefined {
  return interactions.find((interaction) => interaction.slug === slug);
}
