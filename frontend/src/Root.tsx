import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { MatchmakingProvider } from './contexts/MatchmakingContext.tsx';

export function Root() {
  return (
    <AuthProvider>
      <MatchmakingProvider>
        <App />
      </MatchmakingProvider>
    </AuthProvider>
  );
}
