import { ThemeProvider } from '@mui/material/styles';
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import BackendConnector from './components/BackendConnector.tsx';
import ErrorFallback from './components/ErrorFallback';
import './index.css';
import { initSentry } from './monitoring/sentry';
import GamePage from './pages/GamePage.tsx';
import HomePage from './pages/HomePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import TestSentry from './pages/TestSentry.tsx';
import theme from './theme.ts';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '', element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'game', element: <GamePage /> },
      { path: 'test', element: <TestSentry /> },
      { path: 'connector', element: <BackendConnector /> },
    ],
  },
]);

initSentry();

const errorFallback: Sentry.ErrorBoundaryProps['fallback'] = ({
  error,
  resetError,
}) => <ErrorFallback error={error} resetError={resetError} />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <Sentry.ErrorBoundary fallback={errorFallback}>
        <RouterProvider router={router} />
      </Sentry.ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
);
