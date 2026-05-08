import { useContext } from 'react';
import { ThemeContext } from './themeContextValue';

export const useThemeMode = () => useContext(ThemeContext);
