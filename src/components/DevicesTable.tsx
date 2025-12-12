import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Laptop, Monitor, Keyboard, Mouse, Smartphone, Server } from "lucide-react";

export type DeviceStatus = "available" | "assigned" | "maintenance" | "retired";

export interface Device {
  id: string;
  assetCode?: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate?: string;
  deliveryDate?: string;
  receivedDate?: string;
  status: DeviceStatus;
  assignedTo?: string;
}

interface DevicesTableProps {
  devices: Device[];
  showCode?: boolean;
}

const getDeviceIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "laptop":
      return <Laptop className="h-4 w-4" />;
    case "monitor":
      return <Monitor className="h-4 w-4" />;
    case "teclado":
      return <Keyboard className="h-4 w-4" />;
    case "mouse":
      return <Mouse className="h-4 w-4" />;
    case "móvil":
      return <Smartphone className="h-4 w-4" />;
    case "servidor":
      return <Server className="h-4 w-4" />;
    default:
      return <Laptop className="h-4 w-4" />;
  }
};

const getStatusBadge = (status?: string) => {
  const raw = status || "";
  const normalized = raw
    .normalize?.("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

  // default
  let label = "Desconocido";
  let className = "bg-muted text-muted-foreground";

  if (normalized.includes("available") || normalized.includes("disponibl")) {
    label = "Disponible";
    className = "bg-success text-success-foreground";
  } else if (normalized.includes("assigned") || normalized.includes("asign")) {
    label = "Asignado";
    className = "bg-primary text-primary-foreground";
  } else if (normalized.includes("maintenance") || normalized.includes("mantenim")) {
    label = "Mantenimiento";
    className = "bg-warning text-warning-foreground";
  } else if (
    normalized.includes("retired") ||
    normalized.includes("retir") ||
    normalized.includes("decommission") ||
    normalized.includes("baja")
  ) {
    label = "Dado de baja";
    className = "bg-destructive text-destructive-foreground";
  }

  return (
    <Badge className={className}>
      {label}
    </Badge>
  );
};

export const DevicesTable = ({ devices, showCode }: DevicesTableProps) => {
  const formatDate = (value?: string) => {
    if (!value) return '-';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-ES');
    } catch (e) {
      return '-';
    }
  };

  const isOlderThanFiveYears = (value?: string) => {
    if (!value) return false;
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const fiveYearsMs = 1000 * 60 * 60 * 24 * 365 * 5;
    return now.getTime() - d.getTime() >= fiveYearsMs;
  };
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            {showCode ? <TableHead>Código</TableHead> : null}
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Fecha Compra</TableHead>
            <TableHead>Fecha Entrega</TableHead>
            <TableHead>Fecha Recepción</TableHead>
            <TableHead>Número de Serie</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Asignado a</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => {
            const isOld = isOlderThanFiveYears(device.purchaseDate);
            const typeClass = isOld ? 'text-red-700 font-semibold animate-[pulse_0.9s_ease-in-out_infinite]' : '';
            return (
              <TableRow key={device.id}>
                <TableCell>
                  <div className={`flex items-center gap-2 ${typeClass}`}>
                    {getDeviceIcon(device.type)}
                    <span className="font-medium">{device.type}</span>
                  </div>
                </TableCell>
              {/* render asset code cell if present on device */}
              {showCode ? <TableCell className="font-mono text-sm">{device.assetCode || '-'}</TableCell> : null}

              <TableCell>{device.brand}</TableCell>
              <TableCell>{device.model}</TableCell>
              <TableCell className="text-sm">{formatDate(device.purchaseDate)}</TableCell>
              <TableCell className="text-sm">{formatDate(device.deliveryDate)}</TableCell>
              <TableCell className="text-sm">{formatDate(device.receivedDate)}</TableCell>
              <TableCell className="font-mono text-sm">{device.serialNumber}</TableCell>
              <TableCell>{getStatusBadge(device.status)}</TableCell>
              <TableCell>
                {device.assignedTo ? (
                  <span className="text-foreground">{device.assignedTo}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
