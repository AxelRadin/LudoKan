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

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Ajoute automatiquement le header CSRF pour les méthodes non-sûres
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    const csrftoken = getCookie('csrftoken');
    if (csrftoken && !headers['X-CSRFToken'] && !headers['X-CSRF-Token']) {
      headers['X-CSRFToken'] = csrftoken;
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

// GET simple
export async function apiGet(path: string, options: RequestInit = {}) {
  return request(path, { method: 'GET', ...options });
}

// POST pratique
export async function apiPost(
  path: string,
  body: any,
  options: RequestInit = {}
) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    ...options,
  });
}

// PATCH pratique
export async function apiPatch(
  path: string,
  body: any,
  options: RequestInit = {}
) {
  return request(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
    ...options,
  });
}
