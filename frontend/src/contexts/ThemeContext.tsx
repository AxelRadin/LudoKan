import React, { useMemo, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ThemeContext } from './themeContextValue';

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => !prev);
  };

  const contextValue = useMemo(
    () => ({ darkMode, toggleDarkMode, setDarkMode }),
    [darkMode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#FF3D3D',
          },
          secondary: {
            main: '#FF3D3D',
          },
          ...(darkMode
            ? {
                // Mode sombre
                background: {
                  default: '#1a1010',
                  paper: '#2a2020',
                },
                text: {
                  primary: '#f5e6e6',
                  secondary: '#9e7070',
                },
              }
            : {
                // Mode clair
                background: {
                  default: '#fdf4f4',
                  paper: '#ffffff',
                },
                text: {
                  primary: '#241818',
                  secondary: '#b49393',
                },
              }),
        },
        typography: {
          fontFamily: "'Outfit', sans-serif",
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: darkMode ? '#1a1010' : '#fdf4f4',
                color: darkMode ? '#f5e6e6' : '#241818',
                transition: 'background-color 0.3s ease, color 0.3s ease',
              },
              '*': {
                scrollbarWidth: 'thin',
                scrollbarColor: darkMode
                  ? '#4a3030 #1a1010'
                  : '#d4a4a4 #fdf4f4',
              },
              '*::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '*::-webkit-scrollbar-track': {
                background: darkMode ? '#1a1010' : '#fdf4f4',
              },
              '*::-webkit-scrollbar-thumb': {
                backgroundColor: darkMode ? '#4a3030' : '#d4a4a4',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: darkMode ? '#5a4040' : '#c49393',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
        },
      }),
    [darkMode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
