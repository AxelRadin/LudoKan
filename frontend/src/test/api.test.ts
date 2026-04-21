import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost } from '../services/api';

describe('api utility', () => {
  const originalFetch = globalThis.fetch;
  const originalCookie = document.cookie;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: originalCookie,
    });
    vi.clearAllMocks();
  });

  it('apiGet effectue une requête GET basique', async () => {
    const mockResponse = { data: 'ok' };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockResponse,
    } as Response);

    const result = await apiGet('/test-route');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-route'),
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('apiPost ajoute le token CSRF si le cookie est présent', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    } as Response);

    document.cookie = 'csrftoken=monSuperToken123; autreCookie=valeur';

    await apiPost('/test-post', { name: 'Mario' });

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;
    const headers = requestOptions.headers as Headers;

    expect(headers.get('X-CSRFToken')).toBe('monSuperToken123');
    expect(requestOptions.method).toBe('POST');
    expect(requestOptions.body).toBe(JSON.stringify({ name: 'Mario' }));
  });

  it("lance une erreur si la réponse n'est pas ok", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Non trouvé' }),
    } as Response);

    await expect(apiGet('/not-found')).rejects.toThrow('Non trouvé');
  });
});
