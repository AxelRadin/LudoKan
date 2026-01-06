const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
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
export async function apiGet(path: string) {
  return request(path, { method: 'GET' });
}

// POST pratique
export async function apiPost(path: string, body: any) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
