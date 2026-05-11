import { Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { MatchmakingProvider } from './contexts/MatchmakingContext.tsx';

export function AdminRoot() {
  return (
    <AuthProvider>
      <MatchmakingProvider>
        <Outlet />
      </MatchmakingProvider>
    </AuthProvider>
  );
}
