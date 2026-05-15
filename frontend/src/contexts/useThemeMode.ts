import { useContext } from 'react';
import { apiPatch } from '../services/api';
import { AuthContext } from './AuthContextDef';
import { ThemeContext } from './themeContextValue';

export const useThemeMode = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);
  const { isAuthenticated } = useContext(AuthContext);

  const toggleDarkMode = async () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (isAuthenticated) {
      await apiPatch('/api/auth/user/', {
        theme_preference: newDark ? 'dark' : 'light',
      }).catch(() => {});
    }
  };

  return { darkMode, toggleDarkMode, setDarkMode };
};
