import { StyledEngineProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import 'driver.js/dist/driver.css';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import { AdminRoot } from './AdminRoot.tsx';
import { Root } from './Root.tsx';
import BackendConnector from './components/BackendConnector.tsx';
import ErrorFallback from './components/ErrorFallback';
import { PageLoader } from './components/PageLoader';
import PermissionGuard from './components/admin/PermissionGuard.tsx';
import { ThemeModeProvider } from './contexts/ThemeContext';
import { getStoredConsent } from './hooks/useCookieConsent';
import './i18n';
import './index.css';
import { initSentry } from './monitoring/sentry';

import CookieBanner from './pages/CookieBanner.tsx';
import HomePage from './pages/HomePage.tsx';

const GamesPage = lazy(() => import('./pages/GamesPage.tsx'));
const GamePage = lazy(() => import('./pages/GamePage.tsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx'));
const UserPublicProfilePage = lazy(
  () => import('./pages/UserPublicProfilePage.tsx')
);
const FriendsPage = lazy(() => import('./pages/FriendsPage.tsx'));
const TestSentry = lazy(() => import('./pages/TestSentry.tsx'));
const LicensePage = lazy(() => import('./pages/LicencePage.tsx'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage.tsx'));
const TrendingCategoryPage = lazy(
  () => import('./pages/TrendingCategoryPage.tsx')
);
const GoogleCallbackPage = lazy(() => import('./pages/GoogleCallbackPage.tsx'));
const SteamCallbackPage = lazy(() => import('./pages/SteamCallbackPage.tsx'));
const MicrosoftCallbackPage = lazy(
  () => import('./pages/MicrosoftCallbackPage.tsx')
);
const UserReviewsPage = lazy(() => import('./pages/UserReviewsPage.tsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage.tsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.tsx'));
const PolitiquesPage = lazy(() => import('./pages/PolitiquesPage.tsx'));
const CookiesPage = lazy(() => import('./pages/CookiesPage.tsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.tsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.tsx'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage.tsx'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.tsx'));
const UsersAdmin = lazy(() => import('./pages/admin/UsersAdmin.tsx'));
const AdminGames = lazy(() => import('./pages/admin/AdminGames.tsx'));
const AdminGameDetail = lazy(() => import('./pages/admin/AdminGameDetail.tsx'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets.tsx'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports.tsx'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews.tsx'));
const AdminNotFound = lazy(() => import('./pages/admin/AdminNotFound.tsx'));
const ProtectedAdminRoute = lazy(
  () => import('./components/admin/ProtectedAdminRoute.tsx')
);

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { path: '', element: <HomePage /> },
      { path: 'home', element: <HomePage /> },
      { path: 'cookie-banner', element: <CookieBanner /> },
      {
        path: 'games',
        element: (
          <Suspense fallback={<PageLoader />}>
            <GamesPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'friends',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FriendsPage />
          </Suspense>
        ),
      },
      {
        path: 'u/:pseudo',
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserPublicProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'profile/reviews',
        element: (
          <Suspense fallback={<PageLoader />}>
            <UserReviewsPage />
          </Suspense>
        ),
      },
      {
        path: 'game/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <GamePage />
          </Suspense>
        ),
      },
      {
        path: 'game/igdb/:igdbId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <GamePage />
          </Suspense>
        ),
      },
      {
        path: 'test',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TestSentry />
          </Suspense>
        ),
      },
      { path: 'connector', element: <BackendConnector /> },
      {
        path: 'license',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LicensePage />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SearchResultsPage />
          </Suspense>
        ),
      },
      {
        path: 'trending/genre/:genreId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TrendingCategoryPage />
          </Suspense>
        ),
      },
      {
        path: 'trending/:sort',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TrendingCategoryPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'support',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SupportPage />
          </Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotificationsPage />
          </Suspense>
        ),
      },
      {
        path: 'politiques',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PolitiquesPage />
          </Suspense>
        ),
      },
      {
        path: 'cookies',
        element: (
          <Suspense fallback={<PageLoader />}>
            <CookiesPage />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AboutPage />
          </Suspense>
        ),
      },
      {
        path: 'reset-password/:uid/:token',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'verify-email/:key',
        element: (
          <Suspense fallback={<PageLoader />}>
            <VerifyEmailPage />
          </Suspense>
        ),
      },
      {
        path: 'auth/google/callback',
        element: (
          <Suspense fallback={<PageLoader />}>
            <GoogleCallbackPage />
          </Suspense>
        ),
      },
      {
        path: 'auth/steam/callback',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SteamCallbackPage />
          </Suspense>
        ),
      },
      {
        path: 'auth/microsoft/callback',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MicrosoftCallbackPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoot />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="dashboard.view">
                <AdminDashboard />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="user.view">
                <UsersAdmin />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'games/:gameId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="game_read">
                <AdminGameDetail />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'games',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="game_read">
                <AdminGames />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'reviews',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <AdminReviews />
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'ratings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <Navigate to="/admin/reviews?tab=notes" replace />
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'tickets',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="support.view">
                <AdminTickets />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <PermissionGuard permission="report_read">
                <AdminReports />
              </PermissionGuard>
            </ProtectedAdminRoute>
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedAdminRoute>
              <AdminNotFound />
            </ProtectedAdminRoute>
          </Suspense>
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
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </Sentry.ErrorBoundary>
      </ThemeModeProvider>
    </StyledEngineProvider>
  </StrictMode>
);
