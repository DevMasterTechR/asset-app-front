import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityLogoutOptions {
  /**
   * Tiempo de inactividad en milisegundos antes de cerrar sesión
   * @default 300000 (5 minutos)
   */
  inactivityTime?: number;
  /**
   * Tiempo antes del logout para mostrar advertencia en milisegundos
   * @default 60000 (1 minuto)
   */
  warningTime?: number;
  /**
   * Función a ejecutar cuando se detecta inactividad
   */
  onInactive: () => void;
  /**
   * Función opcional a ejecutar cuando se muestra la advertencia
   */
  onWarning?: () => void;
  /**
   * Si está habilitado el monitoreo de inactividad
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook personalizado para detectar inactividad del usuario y cerrar sesión automáticamente
 * 
 * Eventos monitoreados:
 * - Movimiento del mouse
 * - Clicks
 * - Teclas presionadas
 * - Scroll
 * - Touch (dispositivos móviles)
 * 
 * @example
 * ```typescript
 * useInactivityLogout({
 *   inactivityTime: 5 * 60 * 1000, // 5 minutos
 *   warningTime: 60 * 1000, // 1 minuto antes
 *   onInactive: () => logout(),
 *   onWarning: () => toast({ title: "Sesión por expirar" })
 * });
 * ```
 */
export function useInactivityLogout({
  inactivityTime = 5 * 60 * 1000, // 5 minutos por defecto
  warningTime = 60 * 1000, // 1 minuto por defecto
  onInactive,
  onWarning,
  enabled = true,
}: UseInactivityLogoutOptions) {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  /**
   * Limpia todos los timers activos
   */
  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current);
      warningTimeoutIdRef.current = null;
    }
    warningShownRef.current = false;
  }, []);

  /**
   * Resetea el timer de inactividad
   * Se llama cada vez que el usuario hace algo (mueve mouse, presiona tecla, etc.)
   */
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Limpiar timers existentes
    clearTimers();

    // Timer para la advertencia
    if (onWarning && warningTime > 0) {
      const timeUntilWarning = inactivityTime - warningTime;
      
      warningTimeoutIdRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          onWarning();
        }
      }, timeUntilWarning);
    }

    // Timer para cerrar sesión
    timeoutIdRef.current = setTimeout(() => {
      onInactive();
    }, inactivityTime);
  }, [enabled, inactivityTime, warningTime, onInactive, onWarning, clearTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Eventos a monitorear
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Inicializar timer
    resetTimer();

    // Agregar listeners para todos los eventos
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup: remover listeners y limpiar timers
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      clearTimers();
    };
  }, [enabled, resetTimer, clearTimers]);

  return {
    /**
     * Resetea manualmente el timer de inactividad
     */
    resetTimer,
    /**
     * Limpia todos los timers (útil para pausar el monitoreo)
     */
    clearTimers,
  };
}
