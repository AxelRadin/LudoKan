import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './i18n';
import App from './App.tsx';
import BackendConnector from './components/BackendConnector.tsx';
import ErrorFallback from './components/ErrorFallback';
import { AuthProvider } from './contexts/AuthContext.tsx';
import './index.css';
import { initSentry } from './monitoring/sentry';
import GamePage from './pages/GamePage.tsx';
import HomePage from './pages/HomePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import TestSentry from './pages/TestSentry.tsx';
import LicensePage from './pages/LicencePage.tsx';
import SearchResultsPage from './pages/SearchResultsPage.tsx';
import TrendingCategoryPage from './pages/TrendingCategoryPage.tsx';
import GoogleCallbackPage from './pages/GoogleCallbackPage.tsx';
import SteamCallbackPage from './pages/SteamCallbackPage.tsx';
import { MatchmakingProvider } from './contexts/MatchmakingContext.tsx';
import SettingsPage from './pages/SettingsPage';
import PolitiquesPage from './pages/PolitiquesPage.tsx';
import CookiesPage from './pages/CookiesPage.tsx';
import CookieBanner from './pages/CookieBanner.tsx';
import { muiTheme } from './muiTheme';
import AboutPage from './pages/AboutPage.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <MatchmakingProvider>
        <App />
      </MatchmakingProvider>
    ),
    children: [
      { path: '', element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'game/:id', element: <GamePage /> },
      { path: 'game/igdb/:igdbId', element: <GamePage /> },
      { path: 'test', element: <TestSentry /> },
      { path: 'connector', element: <BackendConnector /> },
      { path: 'license', element: <LicensePage /> },
      { path: 'search', element: <SearchResultsPage /> },
      { path: 'trending/genre/:genreId', element: <TrendingCategoryPage /> },
      { path: 'trending/:sort', element: <TrendingCategoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'politiques', element: <PolitiquesPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'cookie-banner', element: <CookieBanner /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'auth/google/callback', element: <GoogleCallbackPage /> },
      { path: 'auth/steam/callback', element: <SteamCallbackPage /> },
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        ),
      },
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
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AuthProvider>
          <Sentry.ErrorBoundary fallback={errorFallback}>
            <RouterProvider router={router} />
          </Sentry.ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  </StrictMode>
);
