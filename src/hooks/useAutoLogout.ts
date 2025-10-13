// src/hooks/useAutoLogout.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseAutoLogoutOptions {
  /** Tiempo de inactividad en milisegundos (default: 15 minutos) */
  timeout?: number;
  /** Eventos que resetean el timer */
  events?: string[];
  /** Si debe escuchar cambios en fetch */
  trackFetch?: boolean;
}

/**
 * Hook que cierra sesión automáticamente después de un período de inactividad
 * @param onLogout - Función que se ejecuta al detectar inactividad
 * @param options - Opciones de configuración
 */
export const useAutoLogout = (
  onLogout: () => void | Promise<void>,
  options: UseAutoLogoutOptions = {}
) => {
  const {
    timeout = 5 * 60 * 1000, // 5 minutos por defecto
    events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'],
    trackFetch = true,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);

  // Función para ejecutar logout
  const executeLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    
    isLoggingOutRef.current = true;
    console.log('⏰ Sesión cerrada por inactividad');
    
    try {
      await onLogout();
    } catch (error) {
      console.error('Error durante auto-logout:', error);
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [onLogout]);

  // Función para resetear el timer
  const resetTimer = useCallback(() => {
    // Limpiar timer anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Crear nuevo timer
    timeoutRef.current = setTimeout(() => {
      executeLogout();
    }, timeout);
  }, [timeout, executeLogout]);

  useEffect(() => {
    // Iniciar timer al montar
    resetTimer();

    // Agregar listeners para eventos de usuario
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Interceptar fetch si está habilitado
    let originalFetch: typeof fetch;
    if (trackFetch) {
      originalFetch = window.fetch;
      window.fetch = async (...args) => {
        resetTimer(); // Resetear al hacer request
        return originalFetch(...args);
      };
    }

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      // Restaurar fetch original
      if (trackFetch && originalFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [resetTimer, events, trackFetch]);

  return { resetTimer };
};