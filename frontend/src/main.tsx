import { StyledEngineProvider } from '@mui/material/styles';
import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './i18n';
import BackendConnector from './components/BackendConnector.tsx';
import ErrorFallback from './components/ErrorFallback';
import './index.css';
import 'driver.js/dist/driver.css';
import { initSentry } from './monitoring/sentry';
import { getStoredConsent } from './hooks/useCookieConsent';
import GamePage from './pages/GamePage.tsx';
import HomePage from './pages/HomePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import UserPublicProfilePage from './pages/UserPublicProfilePage.tsx';
import FriendsPage from './pages/FriendsPage.tsx';
import TestSentry from './pages/TestSentry.tsx';
import LicensePage from './pages/LicencePage.tsx';
import SearchResultsPage from './pages/SearchResultsPage.tsx';
import TrendingCategoryPage from './pages/TrendingCategoryPage.tsx';
import GoogleCallbackPage from './pages/GoogleCallbackPage.tsx';
import SteamCallbackPage from './pages/SteamCallbackPage.tsx';
import MicrosoftCallbackPage from './pages/MicrosoftCallbackPage.tsx';
import UserReviewsPage from './pages/UserReviewsPage.tsx';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage.tsx';
import PolitiquesPage from './pages/PolitiquesPage.tsx';
import CookiesPage from './pages/CookiesPage.tsx';
import CookieBanner from './pages/CookieBanner.tsx';
import AboutPage from './pages/AboutPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import VerifyEmailPage from './pages/VerifyEmailPage.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import UsersAdmin from './pages/admin/UsersAdmin.tsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.tsx';
import { Root } from './Root.tsx';
import { ThemeModeProvider } from './contexts/ThemeContext';
import { AdminRoot } from './AdminRoot.tsx';

if (getStoredConsent()?.analytics) {
  initSentry();
}

globalThis.addEventListener('cookieconsentchange', (e: Event) => {
  if ((e as CustomEvent).detail?.analytics) {
    initSentry();
  }
});

const errorFallback: Sentry.ErrorBoundaryProps['fallback'] = ({
  error,
  resetError,
}) => <ErrorFallback error={error} resetError={resetError} />;

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { path: '', element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'u/:pseudo', element: <UserPublicProfilePage /> },
      { path: 'profile/reviews', element: <UserReviewsPage /> },
      { path: 'game/:id', element: <GamePage /> },
      { path: 'game/igdb/:igdbId', element: <GamePage /> },
      { path: 'test', element: <TestSentry /> },
      { path: 'connector', element: <BackendConnector /> },
      { path: 'license', element: <LicensePage /> },
      { path: 'search', element: <SearchResultsPage /> },
      { path: 'trending/genre/:genreId', element: <TrendingCategoryPage /> },
      { path: 'trending/:sort', element: <TrendingCategoryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'politiques', element: <PolitiquesPage /> },
      { path: 'cookies', element: <CookiesPage /> },
      { path: 'cookie-banner', element: <CookieBanner /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'reset-password/:uid/:token', element: <ResetPasswordPage /> },
      { path: 'verify-email/:key', element: <VerifyEmailPage /> },
      { path: 'auth/google/callback', element: <GoogleCallbackPage /> },
      { path: 'auth/steam/callback', element: <SteamCallbackPage /> },
      { path: 'auth/microsoft/callback', element: <MicrosoftCallbackPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoot />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedAdminRoute>
            <UsersAdmin />
          </ProtectedAdminRoute>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeModeProvider>
        <Sentry.ErrorBoundary fallback={errorFallback}>
          <RouterProvider router={router} />
        </Sentry.ErrorBoundary>
      </ThemeModeProvider>
    </StyledEngineProvider>
  </StrictMode>
);
