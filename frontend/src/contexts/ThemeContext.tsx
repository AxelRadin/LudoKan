import React, { createContext, useMemo, useState, useContext } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { getTheme } from '../theme';

const ColorModeContext = createContext({
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const toggleColorMode = () => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ toggleColorMode }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
};
