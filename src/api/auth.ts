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
  role?: { id: number; name: string } | string | null;
}

/**
 * Login con username y password
 * El backend devuelve una cookie httpOnly con el JWT
 */
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ message: string; user?: AuthUser; access_token?: string }> => {
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

    // Debug: loguear respuesta para verificar que backend devuelve access_token
    try {
      // eslint-disable-next-line no-console
      console.log('[authApi] login response', data);
    } catch (e) {
      // noop
    }

    // Guardar token en sessionStorage para backup/redundancia
    // (la cookie httpOnly es la principal, pero sessionStorage permite fallback)
    if (data.access_token) {
      try {
        sessionStorage.setItem('auth_token', data.access_token);
        // Marcar timestamp de último keep-alive para control de sesión
        sessionStorage.setItem('session:keepalive', Date.now().toString());
      } catch (e) {
        // ignorar errores de sessionStorage
      }
    }

    return data;
  },

  /**
   * Logout - limpia la cookie del JWT
   */
  logout: async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Envía la cookie con el JWT
      });

      if (!response.ok) {
        throw new Error('Error al cerrar sesión');
      }
    } finally {
      // Limpiar token de sessionStorage sin importar si logout tuvo éxito
      try {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('session:keepalive');
      } catch (e) {
        // ignorar
      }
    }
  },

  /**
   * Verificar si el usuario está autenticado
   */
  verifyAuth: async (): Promise<AuthUser | null> => {
    try {
      const response = await apiFetch('/auth/me', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // 401 o 403 → usuario no autenticado
        console.error('[verifyAuth] Fallo la autenticación:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('[verifyAuth] Usuario obtenido:', data);
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

  sessionStatus: async (): Promise<{ remainingSeconds: number | null; lastActivityAt?: string | null; timeoutMinutes: number } | null> => {
    try {
      const response = await apiFetch('/auth/session', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return null;
      const data = await response.json();
      // sessionStatus obtained
      return data;
    } catch (e) {
      console.error('Error fetching session status', e);
      return null;
    }
  },
};