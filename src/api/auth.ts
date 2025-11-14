// authApi.ts - Para Vite
import { API_URL } from '@/lib/config';
import apiFetch from '@/lib/fetchClient';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthUser {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  nationalId?: string;
}

/**
 * Login con username y password
 * El backend devuelve una cookie httpOnly con el JWT
 */
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ message: string; user?: AuthUser }> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Importante: permite enviar/recibir cookies
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al iniciar sesión' }));
      throw new Error(error.message || 'Credenciales incorrectas');
    }

    const data = await response.json();

    // Si el backend devuelve access_token, guardarlo para usar Authorization
    if (data?.access_token) {
      try {
        localStorage.setItem('access_token', data.access_token);
      } catch (e) {
        console.warn('No se pudo guardar access_token en localStorage', e);
      }
    }

    return data;
  },

  /**
   * Logout - limpia la cookie del JWT
   */
  logout: async (): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Envía la cookie con el JWT
    });

    if (!response.ok) {
      throw new Error('Error al cerrar sesión');
    }

    try {
      localStorage.removeItem('access_token');
    } catch (e) {
      console.warn('Error removing access_token', e);
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  verifyAuth: async (): Promise<AuthUser | null> => {
  try {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      // 401 o 403 → usuario no autenticado
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error verifying auth:', error);
    return null;
  }
},

  /** Keepalive: refresca última actividad en servidor (SessionGuard) */
  keepAlive: async (): Promise<boolean> => {
    try {
      const res = await apiFetch('/auth/keepalive', { method: 'GET' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },
};