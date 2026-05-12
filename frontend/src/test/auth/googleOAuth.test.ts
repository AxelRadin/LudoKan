import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('googleOAuth', () => {
  const originalLocation = globalThis.location;

  beforeEach(() => {
    vi.resetModules();

    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    globalThis.location = originalLocation;
    vi.unstubAllEnvs();
  });

  it('lance une erreur si VITE_GOOGLE_CLIENT_ID est manquant ou vide', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '   ');
    vi.stubEnv('VITE_GOOGLE_REDIRECT_URI', 'http://localhost/callback');

    const { startGoogleLogin } = await import('../../auth/googleOAuth');

    expect(() => startGoogleLogin()).toThrow(/VITE_GOOGLE_CLIENT_ID manquant/);
  });

  it('lance une erreur si VITE_GOOGLE_REDIRECT_URI est manquant ou vide', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'mon-client-id');
    vi.stubEnv('VITE_GOOGLE_REDIRECT_URI', '');

    const { startGoogleLogin } = await import('../../auth/googleOAuth');

    expect(() => startGoogleLogin()).toThrow(
      /VITE_GOOGLE_REDIRECT_URI manquant/
    );
  });

  it('redirige vers la bonne URL Google avec tous les paramètres encodés', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'mon-client-id');
    vi.stubEnv('VITE_GOOGLE_REDIRECT_URI', 'http://localhost/callback');

    const { startGoogleLogin } = await import('../../auth/googleOAuth');

    startGoogleLogin();

    const url = globalThis.location.href;

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=mon-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcallback');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile');
    expect(url).toContain('access_type=online');
    expect(url).toContain('prompt=select_account');
  });

  it("utilise les valeurs de repli si les variables d'environnement sont totalement absentes (undefined)", async () => {
    const prevClientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const prevRedirectUri = process.env.VITE_GOOGLE_REDIRECT_URI;

    delete process.env.VITE_GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_REDIRECT_URI;

    const { startGoogleLogin } = await import('../../auth/googleOAuth');

    expect(() => startGoogleLogin()).toThrow(/VITE_GOOGLE_CLIENT_ID manquant/);

    if (prevClientId !== undefined)
      process.env.VITE_GOOGLE_CLIENT_ID = prevClientId;
    if (prevRedirectUri !== undefined)
      process.env.VITE_GOOGLE_REDIRECT_URI = prevRedirectUri;
  });
});
