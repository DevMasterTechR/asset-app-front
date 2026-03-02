// src/lib/fetchClient.ts
import { API_TIMEOUT_MS, API_URL, SEND_BEARER_TOKEN } from './config';

type ApiRequestInit = RequestInit & {
  timeoutMs?: number;
};

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

export async function apiFetch(input: RequestInfo, init?: ApiRequestInit): Promise<Response> {
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

  if (SEND_BEARER_TOKEN) {
    try {
      // Fallback opcional: solo enviar Bearer si está habilitado explícitamente.
      // Por defecto usamos cookie httpOnly para evitar cierres por token en sessionStorage desactualizado.
      const token = sessionStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignorar errores de sessionStorage
    }
  }

  merged.headers = headers;

  // Asegurar envio de cookies por defecto (cookie HttpOnly es el método principal)
  (merged as any).credentials = (merged as any).credentials ?? 'include';

  const timeoutMs = init?.timeoutMs ?? API_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = init?.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort((externalSignal as any).reason);
    } else {
      externalSignal.addEventListener('abort', () => controller.abort((externalSignal as any).reason), { once: true });
    }
  }

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      controller.abort(new Error(`Timeout de API tras ${timeoutMs}ms`));
    }, timeoutMs);
  }

  merged.signal = controller.signal;

  try {
    return await fetch(url, merged);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default apiFetch;
