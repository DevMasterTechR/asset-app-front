// src/hooks/useSessionKeepAlive.tsx
import { useEffect, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { authApi } from '@/api/auth';

interface Options {
  sessionMinutes?: number; // default 15
  warningSeconds?: number; // default 30
}

export function useSessionKeepAlive(isAuthenticated: boolean, onLogout: () => Promise<void> | void, options: Options = {}) {
  const { sessionMinutes = 15, warningSeconds = 30 } = options;

  const keepAliveIntervalRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const toastRef = useRef<ReturnType<typeof toast> | null>(null);

  const clearAll = useCallback(() => {
    if (keepAliveIntervalRef.current !== null) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    if (warningTimeoutRef.current !== null) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    try {
      toastRef.current?.dismiss();
      toastRef.current = null;
    } catch (e) {}
  }, []);

  const scheduleTimers = useCallback(() => {
    clearAll();

    const sessionMs = sessionMinutes * 60 * 1000;
    const warningMs = warningSeconds * 1000;

    // Schedule warning to show warningSeconds before session expiry
    warningTimeoutRef.current = window.setTimeout(() => {
      let remaining = warningSeconds;

      const action = (
        <ToastAction onClick={async () => {
          try {
            await authApi.keepAlive();
          } catch (e) {}
          scheduleTimers();
          try { toastRef.current?.dismiss(); } catch (e) {}
        }}>
          Permanecer conectado
        </ToastAction>
      );

      // Mostrar toast destructivo y persistente (duración larga) hasta que haya actividad
      toastRef.current = toast({
        title: 'Sesión por expirar',
        description: `Se cerrará la sesión en ${remaining} segundos por inactividad.`,
        action,
        // Variant 'destructive' aplica estilo rojo en Toast UI
        variant: 'destructive' as any,
        // Duración larga (24h) para evitar que Radix lo cierre automáticamente
        duration: 24 * 60 * 60 * 1000,
      });

      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (!toastRef.current) return;
        if (remaining <= 0) {
          try { toastRef.current.update({ description: 'Cerrando sesión...' }); } catch (e) {}
          clearAll();
          // Ejecutar logout
          onLogout();
          return;
        }
        try { toastRef.current.update({ description: `Se cerrará la sesión en ${remaining} segundos por inactividad.` }); } catch (e) {}
      }, 1000);

    }, sessionMinutes * 60 * 1000 - warningSeconds * 1000);

    // Also set periodic keepalive slightly before expiry to refresh server
    keepAliveIntervalRef.current = window.setInterval(async () => {
      try {
        await authApi.keepAlive();
        // after successful keepalive, reset timers
        scheduleTimers();
      } catch (e) {
        // ignore
      }
    }, sessionMinutes * 60 * 1000);
  }, [clearAll, onLogout, sessionMinutes, warningSeconds]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAll();
      return;
    }

    // Start timers when authenticated
    scheduleTimers();

    // If user interacts manually, send keepAlive and reset timers
    const onActivity = async () => {
      try {
        await authApi.keepAlive();
      } catch (e) {}
      scheduleTimers();
    };

    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearAll();
    };
  }, [isAuthenticated, scheduleTimers, clearAll]);
}

export default useSessionKeepAlive;
