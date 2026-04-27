import { apiGet } from '../services/api';

export async function startSteamLogin(): Promise<void> {
  try {
    const data = await apiGet('/api/auth/steam/login/');
    if (data.auth_url) {
      globalThis.location.href = data.auth_url;
    } else {
      throw new Error("URL d'authentification manquante.");
    }
  } catch {
    throw new Error("Impossible d'initier la connexion avec Steam.");
  }
}
