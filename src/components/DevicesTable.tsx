import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Laptop, Monitor, Keyboard, Mouse, Smartphone, Server } from "lucide-react";

export type DeviceStatus = "available" | "assigned" | "maintenance" | "retired";

export interface Device {
  id: string;
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

const getStatusBadge = (status: DeviceStatus) => {
  const variants: Record<DeviceStatus, { label: string; className: string }> = {
    available: { label: "Disponible", className: "bg-success text-success-foreground" },
    assigned: { label: "Asignado", className: "bg-primary text-primary-foreground" },
    maintenance: { label: "Mantenimiento", className: "bg-warning text-warning-foreground" },
    retired: { label: "Retirado", className: "bg-muted text-muted-foreground" },
  };

  return (
    <Badge className={variants[status].className}>
      {variants[status].label}
    </Badge>
  );
};

export const DevicesTable = ({ devices }: DevicesTableProps) => {
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
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
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
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getDeviceIcon(device.type)}
                  <span className="font-medium">{device.type}</span>
                </div>
              </TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
