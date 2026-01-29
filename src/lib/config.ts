// Central API configuration
const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
	// eslint-disable-next-line no-console
	console.warn('VITE_API_URL no está definido en .env. Configura el backend en asset-app-front/.env');
}

export const API_URL: string = (rawApiUrl || '').replace(/\/+$/, '');
