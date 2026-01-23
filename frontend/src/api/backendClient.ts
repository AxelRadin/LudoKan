// frontend/src/api/backendClient.ts

const BACKEND_URL = "http://localhost:8000/api";

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(BACKEND_URL + path, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }

  // on laisse TS inférer, on typéra plus haut si besoin
  return res.json();
}

const backendClient = {
  get(path: string) {
    return request(path);
  },
  post(path: string, body: any) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  patch(path: string, body: any) {
    return request(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  delete(path: string) {
    return request(path, { method: "DELETE" });
  },
};

export default backendClient;
