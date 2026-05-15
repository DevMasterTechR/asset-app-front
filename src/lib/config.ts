// Central API configuration
const rawApiUrl = import.meta.env.VITE_API_URL;
const rawApiTimeoutMs = import.meta.env.VITE_API_TIMEOUT_MS;
const rawSendBearerToken = import.meta.env.VITE_SEND_BEARER_TOKEN;
const DEFAULT_API_URL = 'https://asset-app-back-83gi.onrender.com';
const OLD_API_URL = 'https://asset-app-back.onrender.com';

function normalizeApiUrl(value?: string): string {
	const trimmed = (value || '').trim().replace(/\/+$/, '');
	if (!trimmed) return DEFAULT_API_URL;
	// Solo reemplazar si es exactamente la URL antigua
	return trimmed === OLD_API_URL ? DEFAULT_API_URL : trimmed;
}

if (!rawApiUrl || rawApiUrl.trim().replace(/\/+$/, '') === OLD_API_URL) {
	// eslint-disable-next-line no-console
	console.warn(`[Config] VITE_API_URL no está configurada o apunta al backend antiguo. Usando fallback: ${DEFAULT_API_URL}`);
}

export const API_URL: string = normalizeApiUrl(rawApiUrl);

const parsedTimeout = Number(rawApiTimeoutMs);
export const API_TIMEOUT_MS: number = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

export const SEND_BEARER_TOKEN: boolean = String(rawSendBearerToken ?? '').toLowerCase() === 'true';
