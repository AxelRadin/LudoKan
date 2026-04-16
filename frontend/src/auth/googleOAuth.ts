const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? '';

export function startGoogleLogin(): void {
  if (!GOOGLE_CLIENT_ID.trim()) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID manquant : définissez-le dans frontend/.env (voir frontend/.env.example).'
    );
  }
  if (!GOOGLE_REDIRECT_URI.trim()) {
    throw new Error(
      'VITE_GOOGLE_REDIRECT_URI manquant : doit correspondre exactement à une URI autorisée dans la console Google (ex. http://localhost:5173/auth/google/callback).'
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
