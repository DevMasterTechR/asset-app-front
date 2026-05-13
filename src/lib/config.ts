// Central API configuration
const rawApiUrl = import.meta.env.VITE_API_URL;
const rawApiTimeoutMs = import.meta.env.VITE_API_TIMEOUT_MS;
const rawSendBearerToken = import.meta.env.VITE_SEND_BEARER_TOKEN;
const DEFAULT_API_URL = 'https://asset-app-back-83gi.onrender.com';

function normalizeApiUrl(value?: string): string {
	const trimmed = (value || '').trim().replace(/\/+$/, '');
	if (!trimmed) return DEFAULT_API_URL;
	return trimmed.replace('https://asset-app-back.onrender.com', DEFAULT_API_URL);
}

if (!rawApiUrl || rawApiUrl.includes('asset-app-back.onrender.com')) {
	// eslint-disable-next-line no-console
	console.warn('VITE_API_URL no apunta al backend actual. Se usará la URL de fallback configurada.');
}

export const API_URL: string = normalizeApiUrl(rawApiUrl);

const parsedTimeout = Number(rawApiTimeoutMs);
export const API_TIMEOUT_MS: number = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

export const SEND_BEARER_TOKEN: boolean = String(rawSendBearerToken ?? '').toLowerCase() === 'true';
