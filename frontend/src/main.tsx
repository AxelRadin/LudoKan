import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Sentry, initSentry } from './monitoring/sentry';
import ErrorFallback from './components/ErrorFallback';
import TestSentry from './pages/TestSentry.tsx';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/test', element: <TestSentry /> },
]);

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
