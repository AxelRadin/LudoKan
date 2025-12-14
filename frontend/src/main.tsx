import { ThemeProvider } from '@mui/material/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import ErrorFallback from './components/ErrorFallback';
import './index.css';
import { initSentry, Sentry } from './monitoring/sentry';
import HomePage from './pages/HomePage.tsx';
import TestSentry from './pages/TestSentry.tsx';
import theme from './theme.ts';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/home', element: <HomePage /> },
  { path: '/test', element: <TestSentry /> },
]);

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <Sentry.ErrorBoundary
        fallback={({ error, resetError }) => (
          <ErrorFallback error={error} resetError={resetError} />
        )}
      >
        <RouterProvider router={router} />
      </Sentry.ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);
