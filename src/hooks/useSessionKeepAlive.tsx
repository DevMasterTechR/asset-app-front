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
  const lastLogoutTsRef = useRef<number>(0);
  const lastKeepaliveTsRef = useRef<number>(0);
  const lastWarningExpiryRef = useRef<number>(0);

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

  const scheduleTimers = useCallback((initialRemainingSeconds?: number | null) => {
    clearAll();
    // scheduleTimers called
    const sessionMs = initialRemainingSeconds !== undefined && initialRemainingSeconds !== null
      ? initialRemainingSeconds * 1000
      : sessionMinutes * 60 * 1000;
    const warningMs = warningSeconds * 1000;

    // Schedule warning to show warningSeconds before session expiry
    warningTimeoutRef.current = window.setTimeout(() => {
      let remaining = warningSeconds;

      // aviso mostrado (warning starts)

      const action = (
        <ToastAction onClick={async () => {
          try {
            await authApi.keepAlive();
          } catch (e) {}
          scheduleTimers();
          try { toastRef.current?.dismiss(); } catch (e) {}
          try { localStorage.setItem('session:keepalive', String(Date.now())); localStorage.removeItem('session:warning'); } catch (e) {}
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

      // Emitir evento público con cuenta regresiva para que la UI pueda mostrarla
      try {
        window.dispatchEvent(new CustomEvent('session-countdown', { detail: { remaining } }));
      } catch (e) {}

      // Notificar a otras pestañas que la advertencia ha comenzado (enviar expiry)
      try {
        const expiry = Date.now() + remaining * 1000;
        localStorage.setItem('session:warning', String(expiry));
      } catch (e) {}

      countdownIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (!toastRef.current) return;
        if (remaining <= 0) {
          try { toastRef.current.update({ description: 'Cerrando sesión...' }); } catch (e) {}
          // Emitir evento de expiración
          try { window.dispatchEvent(new CustomEvent('session-countdown', { detail: { remaining: 0 } })); } catch (e) {}
          // Notificar a otras pestañas que se cerró la sesión
          try { localStorage.setItem('session:logout', String(Date.now())); } catch (e) {}
          clearAll();
          // Ejecutar logout
          onLogout();
          return;
        }
        try { toastRef.current.update({ description: `Se cerrará la sesión en ${remaining} segundos por inactividad.` }); } catch (e) {}
        // Emitir actualización de cuenta regresiva
        try { window.dispatchEvent(new CustomEvent('session-countdown', { detail: { remaining } })); } catch (e) {}
      }, 1000);

    }, Math.max(0, sessionMs - warningMs));

    // NOTE: removed automatic periodic keepAlive to avoid token regeneration
    // and unexpected 401s. keepAlive will only be called when the user
    // explicitly clicks the 'Permanecer conectado' action in the warning.
  }, [clearAll, onLogout, sessionMinutes, warningSeconds]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAll();
      return;
    }

    // Get current server session status to synchronize timers
    (async () => {
      try {
        const status = await authApi.sessionStatus();
        // sessionStatus result obtained
        if (status && typeof status.remainingSeconds === 'number') {
          scheduleTimers(status.remainingSeconds);
        } else {
          scheduleTimers();
        }
      } catch (e) {
        scheduleTimers();
      }
    })();

    // If user interacts manually, send a throttled keepAlive to server and reset timers
    const onActivity = () => {
      const now = Date.now();
      const minInterval = 60 * 1000; // 1 minute between keepAlive calls
      const last = lastKeepaliveTsRef.current || 0;
      // Only call keepAlive at most once per `minInterval` to avoid spamming the server
      if (now - last > minInterval) {
        lastKeepaliveTsRef.current = now;
        // call server to update lastActivityAt (SessionGuard will update it)
        authApi.keepAlive().then(() => {
          // After a successful keepAlive, refresh timers from server
          authApi.sessionStatus().then((status) => {
            if (status && typeof status.remainingSeconds === 'number') scheduleTimers(status.remainingSeconds);
            else scheduleTimers();
          }).catch(() => scheduleTimers());
        }).catch(() => {
          // If keepAlive fails, just reschedule client timers to be conservative
          scheduleTimers();
        });
      } else {
        // If we skip calling keepAlive due to throttle, still refresh local timers
        scheduleTimers();
      }
    };

    // Listen to a broader set of user events so inactivity is detected reliably
    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('scroll', onActivity);

    // Escuchar storage para sincronizar entre pestañas
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key) return;

        if (e.key === 'session:keepalive') {
          const ts = Number(e.newValue);
          if (isNaN(ts)) return;
          // Ignore keepalive events older or equal to the one this tab emitted
          if (ts <= (lastKeepaliveTsRef.current || 0)) return;
          lastKeepaliveTsRef.current = ts;
          (async () => {
            try {
              const status = await authApi.sessionStatus();
              if (status && typeof status.remainingSeconds === 'number') scheduleTimers(status.remainingSeconds);
            } catch (err) {}
          })();

        } else if (e.key === 'session:logout') {
          const ts = Number(e.newValue);
          if (isNaN(ts)) return;
          // If this tab already emitted a logout with equal/newer timestamp, ignore
          if (ts <= (lastLogoutTsRef.current || 0)) return;
          lastLogoutTsRef.current = ts;
          try { onLogout(); } catch (err) {}

        } else if (e.key === 'session:warning') {
          const expiry = Number(localStorage.getItem('session:warning'));
          if (isNaN(expiry)) return;
          // Ignore warnings we've already processed
          if (expiry <= (lastWarningExpiryRef.current || 0)) return;
          lastWarningExpiryRef.current = expiry;
          const remaining = Math.max(0, Math.ceil((expiry - Date.now()) / 1000));
          scheduleTimers(remaining);
        }
      } catch (e) {}
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('storage', onStorage);
      clearAll();
    };
  }, [isAuthenticated, scheduleTimers, clearAll]);
}

export default useSessionKeepAlive;
