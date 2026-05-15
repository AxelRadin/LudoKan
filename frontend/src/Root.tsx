import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { MatchmakingProvider } from './contexts/MatchmakingContext.tsx';
import { NotificationsProvider } from './contexts/NotificationsContext.tsx';

export function Root() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <MatchmakingProvider>
          <App />
        </MatchmakingProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
