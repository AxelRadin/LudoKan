import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../services/api';

describe('api utility', () => {
  const originalFetch = globalThis.fetch;
  const originalCookie = typeof document !== 'undefined' ? document.cookie : '';

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    // Sécurité : on ne modifie le cookie que si le document existe
    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });
    }
  });

  afterEach(() => {
    // 1. Restaurer immédiatement les globales (dont 'document') AVANT de faire quoi que ce soit d'autre
    vi.unstubAllGlobals();
    vi.clearAllMocks();

    // 2. Ensuite seulement on restaure fetch et les cookies
    globalThis.fetch = originalFetch;
    if (typeof document !== 'undefined') {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: originalCookie,
      });
    }
  });

  // --- GET ---
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

  // --- POST ---
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

  // --- PATCH ---
  it('apiPatch envoie du JSON par défaut', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ updated: true }),
    } as Response);

    await apiPatch('/test-patch', { status: 'active' });

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;
    const headers = requestOptions.headers as Headers;

    expect(requestOptions.method).toBe('PATCH');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(requestOptions.body).toBe(JSON.stringify({ status: 'active' }));
  });

  it('apiPatch gère correctement FormData (supprime le Content-Type)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ updated: true }),
    } as Response);

    const formData = new FormData();
    formData.append('file', new Blob(['test'], { type: 'text/plain' }));

    await apiPatch('/test-patch-form', formData);

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;
    const headers = requestOptions.headers as Headers;

    expect(requestOptions.method).toBe('PATCH');
    expect(headers.has('Content-Type')).toBe(false);
    expect(requestOptions.body).toBe(formData);
  });

  // --- DELETE ---
  it('apiDelete effectue une requête DELETE', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ deleted: true }),
    } as Response);

    await apiDelete('/test-delete');

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;

    expect(requestOptions.method).toBe('DELETE');
  });

  // --- GESTION DES RÉPONSES ET ERREURS ---
  it("retourne null si la réponse n'est pas au format JSON (ex: 204 No Content)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    } as Response);

    const result = await apiGet('/no-content');
    expect(result).toBeNull();
  });

  it("lance une erreur avec la propriété 'detail' si elle existe", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Ressource non trouvée' }),
    } as Response);

    await expect(apiGet('/not-found')).rejects.toThrow('Ressource non trouvée');
  });

  it("lance une erreur avec JSON.stringify(data) s'il n'y a pas de propriété 'detail'", async () => {
    const errorData = { message: 'Une erreur custom' };
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorData,
    } as Response);

    await expect(apiGet('/bad-request')).rejects.toThrow(
      JSON.stringify(errorData)
    );
  });

  it("lance une erreur générique s'il n'y a pas de corps de réponse (Erreur API: status)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers(),
    } as Response);

    await expect(apiGet('/server-error')).rejects.toThrow('Erreur API: 500');
  });

  // --- TESTS DES LIMITES ---

  it('getCookie retourne null si document est undefined (SSR) (Ligne 5)', async () => {
    vi.stubGlobal('document', undefined);

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    } as Response);

    await apiPost('/ssr-test', {});

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = fetchCallArgs[1]?.headers as Headers;

    expect(headers?.has('X-CSRFToken')).toBe(false);
  });

  it('getCookie ignore les cookies non-correspondants et boucle correctement (Ligne 9)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    } as Response);

    document.cookie = 'mauvaisCookie=123; csrftoken=leBonToken';

    await apiPost('/test-cookie-loop', {});

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const headers = fetchCallArgs[1]?.headers as Headers;
    expect(headers?.get('X-CSRFToken')).toBe('leBonToken');
  });

  it('request utilise GET par défaut si la méthode est falsy (Ligne 17)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    } as Response);

    await apiGet('/test-falsy-method', { method: '' });

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;

    expect(requestOptions.method).toBe('GET');
  });

  it("apiPatch ne redéfinit pas le Content-Type s'il est déjà fourni (Ligne 95)", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
    } as Response);

    await apiPatch(
      '/test-custom-header',
      { test: 1 },
      {
        headers: { 'Content-Type': 'application/vnd.api+json' },
      }
    );

    const fetchCallArgs = vi.mocked(globalThis.fetch).mock.calls[0];
    const requestOptions = fetchCallArgs[1] as RequestInit;
    const headers = requestOptions.headers as Headers;

    expect(headers?.get('Content-Type')).toBe('application/vnd.api+json');
  });
});
