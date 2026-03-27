import { useContext } from 'react';
import { AuthContext } from './AuthContextDef';

export function useAuth() {
  return useContext(AuthContext);
}
