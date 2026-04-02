const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

async function request(path: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toString().toUpperCase();

  const headers = new Headers(options.headers || {});

  // Ajoute le header CSRF pour les méthodes non-sûres
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    const csrftoken = getCookie('csrftoken');
    if (
      csrftoken &&
      !headers.has('X-CSRFToken') &&
      !headers.has('X-CSRF-Token')
    ) {
      headers.set('X-CSRFToken', csrftoken);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    method,
    headers,
  });
  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType?.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const message =
      data?.detail || JSON.stringify(data) || `Erreur API: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// GET
export async function apiGet(path: string, options: RequestInit = {}) {
  return request(path, { method: 'GET', ...options });
}

// POST
export async function apiPost(
  path: string,
  body: any,
  options: RequestInit = {}
) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

// PATCH
export async function apiPatch(
  path: string,
  body: any,
  options: RequestInit = {}
) {
  const { headers: optionHeaders, ...rest } = options;
  const headers = new Headers(optionHeaders ?? undefined);

  if (isFormData(body)) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return request(path, {
    method: 'PATCH',
    ...rest,
    headers,
    body: isFormData(body) ? body : JSON.stringify(body),
  });
}

// DELETE
export async function apiDelete(path: string, options: RequestInit = {}) {
  return request(path, { method: 'DELETE', ...options });
}
