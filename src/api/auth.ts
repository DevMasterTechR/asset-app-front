// authApi.ts - Para Vite

const API_URL = 'http://localhost:3000';

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

    return response.json();
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
  },

  /**
   * Verificar si el usuario está autenticado
   */
  verifyAuth: async (): Promise<AuthUser | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
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
};