export const colors = {
  background: '#0B0B0F',
  surface: '#16161D',
  surfacePressed: '#1F1F29',
  border: '#26262F',
  textPrimary: '#F5F5F7',
  textSecondary: '#9A9AA5',
  accent: '#7C5CFF',
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const fontSizes = {
  caption: 13,
  body: 16,
  title: 20,
} as const;

export const fontWeights = {
  regular: '400',
  semibold: '600',
} as const;
