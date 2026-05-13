import { apiGet } from '../services/api';

export async function startMicrosoftConnect(): Promise<void> {
  const data = await apiGet('/api/auth/microsoft/connect-url/');
  if (!data?.auth_url) {
    throw new Error("URL d'authentification Microsoft manquante.");
  }
  globalThis.location.href = data.auth_url;
}
