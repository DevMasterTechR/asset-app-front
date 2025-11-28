import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import DevicesSummaryModal from '@/components/DevicesSummaryModal';
import { DevicesTable } from "@/components/DevicesTable";
import Pagination from "@/components/Pagination";
import { devicesApi } from "@/api/devices";
import * as consumablesApi from '@/api/consumables';
import { assignmentsApi } from "@/api/assignments";
import { peopleApi } from "@/api/people";
import { extractArray } from "@/lib/extractData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Search, Users, Package, AlertCircle } from "lucide-react";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, assigned: 0, available: 0, maintenance: 0 });
  const [devices, setDevices] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryCodes, setSummaryCodes] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, assignmentsRes, peopleRes] = await Promise.all([
        devicesApi.getAll(),
        assignmentsApi.getAll(),
        peopleApi.getAll(),
      ]);

      const devicesList = extractArray<any>(devicesRes) || [];
      // Fetch consumables (inks, utp cables, rj45 connectors, power strips)
      let consumablesAll: any[] = [];
      try {
        const [inks, cables, connectors, strips] = await Promise.all([
          consumablesApi.getInks(),
          consumablesApi.getUTPCables(),
          consumablesApi.getRJ45Connectors(),
          consumablesApi.getPowerStrips(),
        ]);

        // Normalize consumables into a common shape similar to devices
        const inksMapped = (inks || []).map((i: any) => ({
          id: `ink-${i.id}`,
          assetCode: i.id || i.model || `${i.brand}-${i.model}`,
          assetType: 'Ink',
          brand: i.brand || '',
          model: i.model || i.color || '',
          serialNumber: i.id || '',
          purchaseDate: i.purchaseDate || undefined,
          status: 'available',
        }));

        const cablesMapped = (cables || []).map((c: any) => ({
          id: `cable-${c.id}`,
          assetCode: c.id || `${c.brand}-${c.type}`,
          assetType: 'UTP Cable',
          brand: c.brand || '',
          model: c.type || '',
          serialNumber: c.id || '',
          purchaseDate: c.purchaseDate || undefined,
          status: 'available',
        }));

        const connectorsMapped = (connectors || []).map((r: any) => ({
          id: `rj45-${r.id}`,
          assetCode: r.id || r.model || '',
          assetType: 'RJ45 Connector',
          brand: r.model || '',
          model: r.type || '',
          serialNumber: r.id || '',
          purchaseDate: r.purchaseDate || undefined,
          status: 'available',
        }));

        const stripsMapped = (strips || []).map((s: any) => ({
          id: `strip-${s.id}`,
          assetCode: s.id || `${s.brand}-${s.model}`,
          assetType: 'Power Strip',
          brand: s.brand || '',
          model: s.model || '',
          serialNumber: s.id || '',
          purchaseDate: s.purchaseDate || undefined,
          status: 'available',
        }));

        consumablesAll = [...inksMapped, ...cablesMapped, ...connectorsMapped, ...stripsMapped];
      } catch (err) {
        // ignore consumables errors for dashboard; we still show devices
        console.warn('No se pudieron cargar consumibles para el dashboard', err);
      }
      const peopleList = extractArray<any>(peopleRes) || [];

      const peopleMap = new Map<string, string>();
      peopleList.forEach((p: any) => {
        peopleMap.set(String(p.id), `${p.firstName} ${p.lastName}`);
      });

      // stats will be computed after combining devices and consumables

      const devicesForTable = devicesList.map((d: any) => ({
        id: String(d.id),
        assetCode: d.assetCode || d.code || d.asset_code || '',
        type: d.assetType || d.type || "Laptop",
        brand: d.brand || "",
        model: d.model || "",
        serialNumber: d.serialNumber || "",
        purchaseDate: d.purchaseDate || undefined,
        status: d.status || "",
        assignedTo: d.assignedPersonId ? peopleMap.get(String(d.assignedPersonId)) : undefined,
      }));

      // Append consumables mapped to the same table shape
      const consumablesForTable = consumablesAll.map((c) => ({
        id: String(c.id),
        assetCode: c.assetCode || '',
        type: c.assetType || 'Consumable',
        brand: c.brand || '',
        model: c.model || '',
        serialNumber: c.serialNumber || '',
        purchaseDate: c.purchaseDate || undefined,
        status: c.status || 'available',
        assignedTo: undefined,
      }));

      const combined = [...devicesForTable, ...consumablesForTable];

      // Compute stats including consumables
      const total = combined.length;
      const assigned = combined.filter((d) => (d.status || '').toString().toLowerCase().includes('assign')).length;
      const available = combined.filter((d) => (d.status || '').toString().toLowerCase().includes('available') || (d.status || '') === '').length;
      const maintenance = combined.filter((d) => (d.status || '').toString().toLowerCase().includes('mainten')).length;

      setStats({ total, assigned, available, maintenance });

      setDevices(combined);

      const assignmentsResAny = assignmentsRes as any;
      const assignmentsList = Array.isArray(assignmentsResAny) ? assignmentsResAny : (assignmentsResAny?.data ?? []);
      const activeAssignments = (assignmentsList || []).filter((a: any) => !a.returnDate);

      const byUser = new Map<string, any>();

      activeAssignments.forEach((a) => {
        const userId = String(a.personId);
        const person = a.person;
        const name = person ? `${person.firstName} ${person.lastName}` : "Desconocido";

        const dev = {
          type: a.asset?.assetType || "Laptop",
          model: a.asset?.model || "",
        };

        if (!byUser.has(userId)) {
          byUser.set(userId, {
            userId,
            userName: name,
            email: person?.username || "",
            department: person?.departmentName || "-",
            devices: [dev],
          });
        } else {
          byUser.get(userId).devices.push(dev);
        }
      });

      setUserAssignments(Array.from(byUser.values()));
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDevicesSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    try {
      // Fetch a large page of devices to build the code summary (limit to 1000)
      const res = await devicesApi.getAll(undefined, 1, 1000);
      const allDevices = extractArray<any>(res) || [];

      // also fetch consumables for the summary
      let consumablesAll: any[] = [];
      try {
        const [inks, cables, connectors, strips] = await Promise.all([
          consumablesApi.getInks(),
          consumablesApi.getUTPCables(),
          consumablesApi.getRJ45Connectors(),
          consumablesApi.getPowerStrips(),
        ]);

        const inksMapped = (inks || []).map((i: any) => ({ code: i.assetCode || i.id || i.model || '', status: i.status || i.state || 'available', type: 'Tintas' }));
        const cablesMapped = (cables || []).map((c: any) => ({ code: c.assetCode || c.id || `${c.brand || ''}-${c.type || ''}`, status: c.status || c.state || 'available', type: 'Cables UTP' }));
        const connectorsMapped = (connectors || []).map((r: any) => ({ code: r.assetCode || r.id || r.model || '', status: r.status || r.state || 'available', type: 'Conectores RJ45' }));
        const stripsMapped = (strips || []).map((s: any) => ({ code: s.assetCode || s.id || `${s.brand || ''}-${s.model || ''}`, status: s.status || s.state || 'available', type: 'Regletas' }));

        consumablesAll = [...inksMapped, ...cablesMapped, ...connectorsMapped, ...stripsMapped];
      } catch (err) {
        console.warn('Error cargando consumibles para resumen', err);
      }

      const deviceCodes = (allDevices || []).map((d: any) => ({ code: d.assetCode || d.code || d.asset_code || '', status: d.status || d.state || '', type: d.assetType || d.type || 'Dispositivos' }));

      const combined = [...deviceCodes, ...consumablesAll].filter((c) => c.code);

      // group by type
      const groupsMap = new Map<string, Array<{ code: string; status?: string }>>();
      combined.forEach((c: any) => {
        const t = c.type || 'Otros';
        if (!groupsMap.has(t)) groupsMap.set(t, []);
        const arr = groupsMap.get(t)!;
        // avoid duplicates
        if (!arr.some((x) => x.code === c.code)) arr.push({ code: c.code, status: c.status });
      });

      const groups = Array.from(groupsMap.entries()).map(([type, items]) => ({ type, items }));
      setSummaryCodes(groups.slice(0, 1000));
    } catch (e) {
      console.error('Error cargando resumen de dispositivos', e);
      setSummaryCodes([]);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDevices = devices.filter((d) =>
    Object.values(d).join(" ").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / limit));
  const displayedDevices = filteredDevices.slice((page - 1) * limit, page * limit);

  const filteredUsers = userAssignments.filter((u) =>
    `${u.userName} ${u.email} ${u.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative">
            <StatsCard title="Total Dispositivos y consumibles" value={stats.total} icon={Package} onClick={openDevicesSummary} />
          </div>
          <StatsCard title="Asignados" value={stats.assigned} icon={Users} variant="default" />
          <StatsCard title="Disponibles" value={stats.available} icon={Package} variant="success" />
          <StatsCard title="Mantenimiento" value={stats.maintenance} icon={AlertCircle} variant="warning" />
        </div>

        <DevicesSummaryModal open={summaryOpen} onOpenChange={setSummaryOpen} codes={summaryCodes} loading={summaryLoading} />

        {/* Search */}
        <div className="flex items-center gap-3 mt-4">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar dispositivos por codigo, marca, modelo, número de serie..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
          <Button onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
        </div>

        {/* Devices table with pagination */}
        <div className="space-y-1">
          <DevicesTable devices={displayedDevices} showCode />
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground text-center">Página {page} / {totalPages}</span>
            <div className="flex-1 flex justify-end">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
                limits={[5,10,15,20]}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
