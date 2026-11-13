import type { ComponentType } from 'react';

export type Interaction = {
  /** URL-safe id. Matches the folder name under src/interactions. */
  slug: string;
  title: string;
  /** One line on what makes this interaction interesting. Shown in the gallery. */
  description: string;
  /** Date the interaction was added, as YYYY-MM-DD. The gallery lists newest first. */
  createdAt: string;
  /** Hide the header and status bar so the interaction fills the whole screen. */
  fullScreen?: boolean;
  Component: ComponentType;
};
