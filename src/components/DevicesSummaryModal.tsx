import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SummaryCode {
  code: string;
  status?: string;
}

interface SummaryGroup {
  type: string;
  items: SummaryCode[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codes: SummaryGroup[];
  loading?: boolean;
}

const DevicesSummaryModal: React.FC<Props> = ({ open, onOpenChange, codes, loading }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = React.useState('');

  const handleViewFull = () => {
    onOpenChange(false);
    navigate('/devices');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumen de Dispositivos y consumibles</DialogTitle>
          <DialogDescription>Listado resumido de códigos agrupados por tipo (filtra por código)</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <input
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="Filtrar por código..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="max-h-64 overflow-auto mt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : codes && codes.length > 0 ? (
            codes.map((group) => {
              const visible = group.items.filter((it) => String(it.code || '').toLowerCase().includes(String(filter || '').toLowerCase()));
              if (visible.length === 0) return null;
              return (
                <div key={group.type}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">{group.type}</h4>
                    <span className="text-xs text-muted-foreground">{visible.length} códigos</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    {visible.map((c) => {
                      const raw = c.status || "";
                      const normalized = raw
                        .normalize?.("NFD")
                        .replace(/\p{Diacritic}/gu, "")
                        .toLowerCase()
                        .replace(/[_-]/g, " ")
                        .trim();

                      let className = "px-2 py-1 rounded bg-muted text-foreground";
                      if (normalized.includes("available") || normalized.includes("disponibl")) {
                        className = "px-2 py-1 rounded bg-success text-success-foreground";
                      } else if (normalized.includes("maintenance") || normalized.includes("mantenim")) {
                        className = "px-2 py-1 rounded bg-warning text-warning-foreground";
                      } else if (normalized.includes("assigned") || normalized.includes("asign")) {
                        className = "px-2 py-1 rounded bg-primary text-primary-foreground";
                      } else if (
                        normalized.includes("retired") ||
                        normalized.includes("retir") ||
                        normalized.includes("baja") ||
                        normalized.includes("decommission") ||
                        normalized.includes("decom")
                      ) {
                        className = "px-2 py-1 rounded bg-destructive text-destructive-foreground";
                      }

                      return (
                        <li key={`${String(c.code)}-${c.status || 'unknown'}`} className={className}>
                          {String(c.code)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No hay dispositivos para mostrar</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={handleViewFull}>Ver resumen completo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevicesSummaryModal;
