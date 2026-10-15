import { createContext, useContext } from 'react';
import { AppColors, AppThemeMode } from './tokens';

type ThemeContextValue = {
  mode: AppThemeMode;
  colors: AppColors;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useAppTheme must be used inside ThemeContext.Provider');
  }
  return theme;
}
