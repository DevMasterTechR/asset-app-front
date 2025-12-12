// src/lib/fetchClient.ts
import { API_URL } from './config';

function normalizeHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!init || !init.headers) return headers;

  const h = init.headers;
  if (h instanceof Headers) {
    h.forEach((v, k) => (headers[k] = v));
  } else if (Array.isArray(h)) {
    (h as Array<[string, string]>).forEach(([k, v]) => (headers[k] = v));
  } else {
    Object.assign(headers, h as Record<string, string>);
  }

  return headers;
}

export async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let url = typeof input === 'string' ? input : (input as Request).url;

  // Si el path empieza por '/', prefixear con API_URL
  if (typeof input === 'string' && input.startsWith('/')) {
    url = `${API_URL}${input}`;
  }

  const merged: RequestInit = { ...(init || {}) };

  // Normalizar y extender headers
  const headers = normalizeHeaders(init);
  headers['Accept'] = headers['Accept'] || 'application/json';

  // Si hay body y no se especificó Content-Type, asumimos JSON
  const hasBody = merged.body !== undefined && merged.body !== null;
  if (hasBody && !('content-type' in Object.keys(headers).reduce((acc, k) => ({ ...acc, [k.toLowerCase()]: true }), {}))) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    // Intentar obtener token de sessionStorage (fallback/redundancia)
    const token = sessionStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignorar errores de sessionStorage
  }

  merged.headers = headers;

  // Asegurar envio de cookies por defecto (cookie HttpOnly es el método principal)
  (merged as any).credentials = (merged as any).credentials ?? 'include';

  return fetch(url, merged);
}

export default apiFetch;
