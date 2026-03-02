// Central API configuration
const rawApiUrl = import.meta.env.VITE_API_URL;
const rawApiTimeoutMs = import.meta.env.VITE_API_TIMEOUT_MS;
const rawSendBearerToken = import.meta.env.VITE_SEND_BEARER_TOKEN;

if (!rawApiUrl) {
	// eslint-disable-next-line no-console
	console.warn('VITE_API_URL no está definido en .env. Configura el backend en asset-app-front/.env');
}

export const API_URL: string = (rawApiUrl || '').replace(/\/+$/, '');

const parsedTimeout = Number(rawApiTimeoutMs);
export const API_TIMEOUT_MS: number = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

export const SEND_BEARER_TOKEN: boolean = String(rawSendBearerToken ?? '').toLowerCase() === 'true';
