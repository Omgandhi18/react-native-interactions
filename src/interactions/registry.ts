// `pnpm new <slug> "<Title>"` adds an import and an entry above the markers below.
import { interaction as springTap } from './spring-tap';
// @new-interaction:imports
import type { Interaction } from './types';

const interactions: readonly Interaction[] = [
  springTap,
  // @new-interaction:entries
];

export const interactionsNewestFirst: readonly Interaction[] = [...interactions].sort((a, b) =>
  b.createdAt.localeCompare(a.createdAt),
);

export function findInteraction(slug: string | undefined): Interaction | undefined {
  return interactions.find((interaction) => interaction.slug === slug);
}
