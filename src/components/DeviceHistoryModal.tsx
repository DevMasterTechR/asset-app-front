import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, History } from 'lucide-react';
import { assignmentsApi } from '@/api/assignments';
import type { Assignment } from '@/data/mockDataExtended';
import { Device } from '@/api/devices';

/**
 * La API devuelve la persona y la sucursal ya resueltas (ver
 * mapBackendToFrontend en api/assignments.ts), pero la interfaz Assignment
 * solo declara los ids. Se tipa acá en vez de castear a any: si algun dia el
 * backend deja de mandarlos, esto es lo que lo hace evidente.
 */
type AsignacionConPersona = Assignment & {
  person?: { id: string; firstName: string; lastName: string };
  branch?: { id: number; name: string };
};

interface DeviceHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | null;
}

/**
 * Quién tuvo este equipo, en orden.
 *
 * El dato ya estaba completo en AssignmentHistory, pero no había forma de
 * verlo sin entrar a la base de datos: cuando un equipo aparecía bajo una
 * persona que no correspondía, no se podía saber de dónde venía ni a quién
 * había que devolvérselo. Esta pantalla es justamente para eso.
 *
 * Vive dentro de /devices, que ya está restringida a administradores en
 * App.tsx (allowedRoles={adminRoles}), así que un usuario común no llega
 * hasta acá. No hace falta volver a comprobar el rol.
 */
export function DeviceHistoryModal({ open, onOpenChange, device }: DeviceHistoryModalProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<AsignacionConPersona[]>([]);

  useEffect(() => {
    if (!open || !device) return;
    let cancelado = false;

    (async () => {
      setCargando(true);
      setError(null);
      try {
        const todas = await assignmentsApi.getAll();
        if (cancelado) return;
        const propias = todas
          .filter((a) => String(a.assetId) === String(device.id))
          // Más reciente primero: lo que uno busca casi siempre es quién lo
          // tiene ahora y quién lo tenía justo antes.
          .sort((a, b) => String(b.assignmentDate ?? '').localeCompare(String(a.assignmentDate ?? '')));
        setHistorial(propias);
      } catch (e: any) {
        if (!cancelado) setError(e?.message || 'No se pudo cargar el historial.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, device]);

  const fecha = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  const nombre = (a: AsignacionConPersona) =>
    a.person ? `${a.person.firstName} ${a.person.lastName}`.trim() : `Persona ${a.personId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de {device?.assetCode ?? 'este equipo'}
          </DialogTitle>
          <DialogDescription>
            {device?.brand} {device?.model} — quiénes lo han tenido, del más reciente al más antiguo.
          </DialogDescription>
        </DialogHeader>

        {cargando && (
          <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        )}

        {!cargando && error && (
          <div className="py-8 text-center text-sm text-destructive">{error}</div>
        )}

        {!cargando && !error && historial.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Este equipo todavía no tiene ninguna entrega registrada.
          </div>
        )}

        {!cargando && !error && historial.length > 0 && (
          <ol className="space-y-3">
            {historial.map((a) => {
              const activa = !a.returnDate;
              return (
                <li
                  key={a.id}
                  className={`rounded-lg border p-3 ${activa ? 'border-primary/40 bg-primary/5' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{nombre(a)}</span>
                    {activa ? (
                      <Badge>Lo tiene ahora</Badge>
                    ) : (
                      <Badge variant="secondary">Devuelto</Badge>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    Entregado: {fecha(a.assignmentDate)}
                    {!activa && <> · Devuelto: {fecha(a.returnDate)}</>}
                    {a.branch?.name && <> · {a.branch.name}</>}
                  </div>

                  {/* Las notas son lo que explica POR QUÉ se movió: los
                      traspasos automáticos dejaron su motivo escrito ahí. */}
                  {a.deliveryNotes && (
                    <div className="mt-1 text-xs text-muted-foreground">Entrega: {a.deliveryNotes}</div>
                  )}
                  {a.returnNotes && (
                    <div className="mt-1 text-xs text-muted-foreground">Devolución: {a.returnNotes}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
