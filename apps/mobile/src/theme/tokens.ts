export const palettes = {
  dark: {
    background: '#020202',
    surface: '#101214',
    surfaceRaised: '#171a1d',
    surfaceSoft: '#22262a',
    border: '#30363d',
    text: '#ffffff',
    textMuted: '#b8bec7',
    textFaint: '#7d8590',
    inverse: '#050505',
    accent: '#ffffff',
  },
  light: {
    background: '#f5f6f8',
    surface: '#ffffff',
    surfaceRaised: '#eef0f3',
    surfaceSoft: '#e5e8ec',
    border: '#d5d9df',
    text: '#101214',
    textMuted: '#525b66',
    textFaint: '#737d89',
    inverse: '#ffffff',
    accent: '#101214',
  },
};

export type AppThemeMode = keyof typeof palettes;
export type AppColors = (typeof palettes)[AppThemeMode];

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};
