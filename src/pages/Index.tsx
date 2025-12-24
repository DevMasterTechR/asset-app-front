import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import DevicesSummaryModal from '@/components/DevicesSummaryModal';
import { DevicesTable } from "@/components/DevicesTable";
import GenerateActaModal from "@/components/GenerateActaModal";
import Pagination from "@/components/Pagination";
import { devicesApi } from "@/api/devices";
import * as consumablesApi from '@/api/consumables';
import { assignmentsApi } from "@/api/assignments";
import { peopleApi } from "@/api/people";
import { credentialsApi, type Credential } from "@/api/credentials";
import { extractArray } from "@/lib/extractData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Loader2, Search, Users, Package, AlertCircle, Pencil, Download, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({ total: 0, assigned: 0, available: 0, maintenance: 0, decommissioned: 0 });
  const [devices, setDevices] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(5);
  const [pageByPerson, setPageByPerson] = useState<number>(1);
  const [limitByPerson, setLimitByPerson] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryCodes, setSummaryCodes] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tab, setTab] = useState<'general' | 'byPerson'>('general');
  const [people, setPeople] = useState<any[]>([]);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerSelection, setOwnerSelection] = useState<{ userId: string; userName: string; branch: string; devices: any[] } | null>(null);
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerError, setOwnerError] = useState<string>("");
  // Se elimina la previsualización del reporte general; solo descarga directa
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [devicesRaw, setDevicesRaw] = useState<any[]>([]);
  const [consumablesReport, setConsumablesReport] = useState<any[]>([]);
  const [assignmentsAll, setAssignmentsAll] = useState<any[]>([]);
  const [assignmentsMode, setAssignmentsMode] = useState<'active' | 'history'>('active');
  const [actaModalOpen, setActaModalOpen] = useState(false);
  const [selectedUserForActa, setSelectedUserForActa] = useState<any>(null);

  const parseDateSafe = (value?: string) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const parts = value.split(/[\/\-]/).map(Number);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      // Interpret as dd/mm/yyyy when day > 12
      const year = c;
      const month = a > 12 ? b : a;
      const day = a > 12 ? a : b;
      const alt = new Date(year, month - 1, day);
      if (!Number.isNaN(alt.getTime())) return alt;
    }
    return null;
  };

  const isOlderThanFiveYears = (purchaseDate?: string) => {
    const date = parseDateSafe(purchaseDate);
    if (!date) return false;
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() - 5);
    return date <= threshold;
  };

  const oldAssetClass = "text-red-700 font-semibold animate-[pulse_0.9s_ease-in-out_infinite]";

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, assignmentsRes, peopleRes, credentialsRes] = await Promise.all([
        devicesApi.getAll(),
        assignmentsApi.getAll(),
        peopleApi.getAll(),
        credentialsApi.getAll(),
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
      setPeople(peopleList || []);
      setCredentials(credentialsRes || []);

      console.log("PeopleList completo:", peopleList);
      if (peopleList.length > 0) {
        console.log("Primera persona ejemplo:", peopleList[0]);
      }

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
        deliveryDate: d.deliveryDate || undefined,
        receivedDate: d.receivedDate || undefined,
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
      const decommissioned = combined.filter((d) => (d.status || '').toString().toLowerCase().includes('decomm')).length;

      setStats({ total, assigned, available, maintenance, decommissioned });

      setDevices(combined);

      const assignmentsResAny = assignmentsRes as any;
      const assignmentsList = Array.isArray(assignmentsResAny) ? assignmentsResAny : (assignmentsResAny?.data ?? []);
      // Excluir asignaciones de dispositivos tipo seguridad
      const assignmentsWithoutSecurity = (assignmentsList || []).filter((a: any) => {
        const assetType = a.asset?.assetType || devicesList.find((d: any) => String(d.id) === String(a.assetId))?.assetType;
        return assetType !== 'security';
      });
      const activeAssignments = assignmentsWithoutSecurity.filter((a: any) => !a.returnDate);

      const byUser = new Map<string, any>();

      activeAssignments.forEach((a) => {
        const userId = String(a.personId);
        const person = a.person;
        
        // Hacer lookup de la persona completa desde peopleList para obtener todos los datos
        const fullPerson = peopleList.find((p: any) => String(p.id) === String(a.personId)) || person;
        const name = fullPerson ? `${fullPerson.firstName} ${fullPerson.lastName}` : "Desconocido";

        // Hacer lookup del asset completo desde devicesList si es necesario
        const fullAsset = devicesList.find((d: any) => String(d.id) === String(a.assetId)) || a.asset;

        const dev = {
          type: a.asset?.assetType || fullAsset?.assetType || "Laptop",
          assetType: a.asset?.assetType || fullAsset?.assetType || "Laptop",
          model: a.asset?.model || fullAsset?.model || "",
          code: a.asset?.assetCode || a.asset?.code || fullAsset?.assetCode || fullAsset?.code || a.asset?.id || '',
          brand: a.asset?.brand || fullAsset?.brand || "-",
          serialNumber: a.asset?.serialNumber || fullAsset?.serialNumber || a.asset?.serial || fullAsset?.serial || "-",
          status: a.asset?.status || fullAsset?.status || "Activo",
          assignmentId: a.id,
          assetId: a.assetId,
          purchaseDate: fullAsset?.purchaseDate || fullAsset?.purchase_date || a.asset?.purchaseDate || a.asset?.purchase_date,
          branchId: a.branchId || a.branch?.id || a.asset?.branchId,
          attributesJson: fullAsset?.attributesJson || a.asset?.attributesJson || {},
          branch:
            a.branch?.name ||
            a.branchName ||
            a.asset?.branchName ||
            a.asset?.branch?.name ||
            a.asset?.branch ||
            fullPerson?.branchName ||
            fullPerson?.branch?.name ||
            fullPerson?.branch ||
            '-',
        };

        if (!byUser.has(userId)) {
          byUser.set(userId, {
            userId,
            userName: name,
            email: fullPerson?.username || "",
            department: fullPerson?.departmentName || "-",
            branch: dev.branch,
            nationalId: fullPerson?.nationalId || "No especificado",
            devices: [dev],
          });
        } else {
          byUser.get(userId).devices.push(dev);
        }
      });

      setUserAssignments(Array.from(byUser.values()));
      setActiveAssignments(activeAssignments || []);
      setAssignmentsAll(assignmentsWithoutSecurity || []);
      setDevicesRaw(devicesList || []);
      setConsumablesReport(consumablesAll || []);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (value?: string) => {
    const d = parseDateSafe(value);
    if (!d) return '-';
    const day = `${d.getDate()}`.padStart(2, '0');
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPersonNameById = (id?: number | string) => {
    if (id === undefined || id === null) return '-';
    const match = people.find((p) => String(p.id) === String(id));
    if (!match) return '-';
    const name = `${match.firstName || ''} ${match.lastName || ''}`.trim();
    return name || '-';
  };

  const getReportData = () => {
    return {
      people,
      credentials,
      devices: devicesRaw,
      consumables: consumablesReport,
      assignments: assignmentsMode === 'active' ? activeAssignments : assignmentsAll,
    };
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const data = getReportData();
    let y = 18;

    const assignmentsTitle = assignmentsMode === 'active' ? 'Asignaciones activas' : 'Historial de asignaciones';
    const assignmentsHead = assignmentsMode === 'active'
      ? ['Persona', 'Equipo', 'Sucursal', 'F. Asignación']
      : ['Persona', 'Equipo', 'Sucursal', 'F. Asignación', 'F. Devolución'];

    doc.setFontSize(18);
    doc.text('Reporte General del Sistema', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, y);
    y += 12;

    const addSectionTitle = (title: string) => {
      doc.setFontSize(14);
      doc.text(title, 14, y);
      y += 6;
    };

    // Personas
    if (data.people.length > 0) {
      addSectionTitle('Personas');
      autoTable(doc, {
        startY: y,
        head: [['Nombre', 'Sucursal', 'Departamento']],
        body: data.people.map((p: any) => [
          `${p.firstName || ''} ${p.lastName || ''}`.trim() || '-',
          p.branch?.name || p.branchName || '-',
          p.department?.name || p.departmentName || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Credenciales (sin contraseñas)
    if (data.credentials.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      addSectionTitle('Credenciales (sin contraseñas)');
      autoTable(doc, {
        startY: y,
        head: [['Persona', 'Sistema', 'Usuario', 'Notas']],
        body: data.credentials.map((c: Credential) => [
          getPersonNameById(c.personId),
          c.system?.toUpperCase?.() || c.system || '-',
          c.username || '-',
          c.notes || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Dispositivos
    if (data.devices.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      addSectionTitle('Dispositivos');
      autoTable(doc, {
        startY: y,
        head: [['Código', 'Tipo', 'Marca', 'Modelo', 'Estado']],
        body: data.devices.map((d: any) => [
          d.assetCode || d.code || '-',
          d.assetType || d.type || '-',
          d.brand || '-',
          d.model || '-',
          d.status || '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Consumibles
    if (data.consumables.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      addSectionTitle('Consumibles');
      autoTable(doc, {
        startY: y,
        head: [['Tipo', 'Marca', 'Modelo', 'Cantidad', 'F. Compra']],
        body: data.consumables.map((c: any) => [
          c.assetType || 'Consumible',
          c.brand || '-',
          c.model || '-',
          c.quantity ?? '-',
          formatDateShort(c.purchaseDate),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Asignaciones (activas o historial)
    if (data.assignments.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      addSectionTitle(assignmentsTitle);
      autoTable(doc, {
        startY: y,
        head: [assignmentsHead],
        body: data.assignments.map((a: any) => {
          const base = [
            `${a.person?.firstName || ''} ${a.person?.lastName || ''}`.trim() || '-',
            a.asset?.assetCode || a.asset?.code || a.assetId || '-',
            a.branch?.name || a.branchName || '-',
            formatDateShort(a.assignmentDate),
          ];
          return assignmentsMode === 'history'
            ? [...base, formatDateShort(a.returnDate)]
            : base;
        }),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`Reporte_General_${new Date().toISOString().split('T')[0]}.pdf`);
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

        const inksMapped = (inks || []).map((i: any) => ({ code: i.assetCode || i.id || i.model || '', status: i.status || i.state || 'available', type: 'Tintas', purchaseDate: i.purchaseDate }));
        const cablesMapped = (cables || []).map((c: any) => ({ code: c.assetCode || c.id || `${c.brand || ''}-${c.type || ''}`, status: c.status || c.state || 'available', type: 'Cables UTP', purchaseDate: c.purchaseDate }));
        const connectorsMapped = (connectors || []).map((r: any) => ({ code: r.assetCode || r.id || r.model || '', status: r.status || r.state || 'available', type: 'Conectores RJ45', purchaseDate: r.purchaseDate }));
        const stripsMapped = (strips || []).map((s: any) => ({ code: s.assetCode || s.id || `${s.brand || ''}-${s.model || ''}`, status: s.status || s.state || 'available', type: 'Regletas', purchaseDate: s.purchaseDate }));

        consumablesAll = [...inksMapped, ...cablesMapped, ...connectorsMapped, ...stripsMapped];
      } catch (err) {
        console.warn('Error cargando consumibles para resumen', err);
      }

      const deviceCodes = (allDevices || []).map((d: any) => ({ code: d.assetCode || d.code || d.asset_code || '', status: d.status || d.state || '', type: d.assetType || d.type || 'Dispositivos', purchaseDate: d.purchaseDate || d.purchase_date }));

      const combined = [...deviceCodes, ...consumablesAll].filter((c) => c.code);

      // group by type
      const groupsMap = new Map<string, Array<{ code: string; status?: string; purchaseDate?: string }>>();
      combined.forEach((c: any) => {
        const t = c.type || 'Otros';
        if (!groupsMap.has(t)) groupsMap.set(t, []);
        const arr = groupsMap.get(t)!;
        // avoid duplicates
        if (!arr.some((x) => x.code === c.code)) arr.push({ code: c.code, status: c.status, purchaseDate: c.purchaseDate });
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const revealSignature = () => {
      const encoded = 'SGVjaG8gcG9yIEJyeWFuIFF1aXNwZSAoQnJ5YW40MDYp';
      const signature = typeof atob === 'function' ? atob(encoded) : 'Hecho por Bryan Quispe (Bryan406)';
      console.info(signature);
    };

    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('bryan406')) {
        revealSignature();
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const filteredDevices = devices.filter((d) =>
    Object.values(d).join(" ").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / limit));
  const orderedDevices = [...filteredDevices].sort((a, b) => Number(isOlderThanFiveYears(b.purchaseDate)) - Number(isOlderThanFiveYears(a.purchaseDate)));
  const displayedDevices = orderedDevices.slice((page - 1) * limit, page * limit);
  const hasOldInFiltered = filteredDevices.some((d) => isOlderThanFiveYears(d.purchaseDate));

  const filteredUsers = userAssignments.filter((u) =>
    `${u.userName} ${u.email} ${u.department} ${u.branch}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const totalPagesByPerson = Math.max(1, Math.ceil(filteredUsers.length / limitByPerson));
  const displayedUsers = filteredUsers.slice((pageByPerson - 1) * limitByPerson, pageByPerson * limitByPerson);
  const assignmentsForDisplay = assignmentsMode === 'active' ? activeAssignments : assignmentsAll;
  const assignmentsLabel = assignmentsMode === 'active' ? 'Asignaciones (activas)' : 'Asignaciones (historial)';

  const openOwnerEditor = (u: any) => {
    setOwnerSelection({ userId: u.userId, userName: u.userName, branch: u.branch, devices: u.devices || [] });
    setNewOwnerId(u.userId);
    setOwnerModalOpen(true);
  };

  const applyOwnerChange = async () => {
    if (!ownerSelection || !newOwnerId) {
      setOwnerModalOpen(false);
      return;
    }

    const targetPerson = people.find((p) => String(p.id) === String(newOwnerId));
    if (!targetPerson) {
      setOwnerError('Selecciona un dueño válido');
      setTimeout(() => setOwnerError(""), 2000);
      return;
    }

    // Validar que el nuevo dueño no tenga asignaciones activas actuales
    const targetActive = userAssignments.find(
      (u) => String(u.userId) === String(newOwnerId) && u.devices && u.devices.length > 0
    );
    const isSameUser = String(newOwnerId) === String(ownerSelection.userId);
    if (targetActive && !isSameUser) {
      setOwnerError('No se puede reasignar: la persona seleccionada ya tiene asignaciones activas.');
      setTimeout(() => setOwnerError(""), 2000);
      return;
    }

    const branchId = targetPerson.branchId ?? targetPerson.branch?.id;
    const devicesToMove = ownerSelection.devices || [];

    try {
      setOwnerSaving(true);

      const now = new Date().toISOString();
      for (const d of devicesToMove) {
        // 1) Cerrar asignación actual
        await assignmentsApi.update(String(d.assignmentId), {
          returnDate: now,
          returnCondition: 'good',
        });

        // 2) Crear nueva asignación al nuevo dueño
        await assignmentsApi.create({
          assetId: d.assetId,
          personId: Number(newOwnerId),
          branchId: branchId !== undefined ? Number(branchId) : undefined,
          assignmentDate: now,
          deliveryCondition: 'good',
          deliveryNotes: 'Transferencia de dueño',
        });
      }

      await loadData();
      setOwnerModalOpen(false);
    } catch (err) {
      console.error('Error cambiando dueño', err);
      alert(err instanceof Error ? err.message : 'No se pudo cambiar el dueño');
    } finally {
      setOwnerSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <StatsCard title="Total Dispositivos y consumibles" value={stats.total} icon={Package} onClick={openDevicesSummary} />
          </div>
          <StatsCard title="Asignados" value={stats.assigned} icon={Users} variant="default" />
          <StatsCard title="Disponibles" value={stats.available} icon={Package} variant="success" />
          <StatsCard title="Mantenimiento" value={stats.maintenance} icon={AlertCircle} variant="warning" />
        </div>

        <DevicesSummaryModal open={summaryOpen} onOpenChange={setSummaryOpen} codes={summaryCodes} loading={summaryLoading} />

        {/* Acciones y buscador */}
        <div className="mt-4 space-y-3">
          <div className="flex justify-end gap-2">
             <Button variant="destructive" className="gap-2" onClick={() => downloadReport()}>
              <Download className="h-4 w-4" />
             Descargar Reporte General PDF
            </Button>
            <Button onClick={loadData} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar
            </Button>
           
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar dispositivos por codigo, marca, modelo, número de serie..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); setPageByPerson(1); }}
            />
          </div>
        </div>

        {/* Tabs: General y Equipo por persona */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'general' | 'byPerson')} className="mt-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="byPerson">Equipo por persona</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            {hasOldInFiltered && (
              <div className="mb-2 text-sm">
                <span className={`inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 ${oldAssetClass}`}>
                  Alerta: equipos con ≥5 años titilan en rojo y se muestran primero en la lista.
                </span>
              </div>
            )}
            <DevicesTable devices={displayedDevices} showCode />
            <div className="mt-4 flex items-center justify-end gap-4">
              <span className="text-sm text-muted-foreground">Página {page} / {totalPages}</span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
                limit={limit}
                onLimitChange={(l) => { setLimit(l); setPage(1); }}
                limits={[5,10,15,20]}
              />
            </div>
          </TabsContent>

          <TabsContent value="byPerson" className="mt-4">
            <div className="border rounded-lg bg-card">
              <div className="p-4 flex items-center justify-between border-b">
                <div>
                  <h3 className="text-lg font-semibold">Equipos por persona</h3>
                  <p className="text-sm text-muted-foreground">Persona, sucursal y códigos de equipos asignados</p>
                </div>
                <Badge variant="secondary">{filteredUsers.length} personas</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr className="border-b">
                      <th className="px-4 py-3">Persona</th>
                      <th className="px-4 py-3">Sucursal</th>
                      <th className="px-4 py-3">Equipos</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No hay asignaciones activas para mostrar.</td>
                      </tr>
                    ) : (
                      displayedUsers.map((u) => (
                        <tr key={u.userId} className="border-b last:border-b-0">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            {u.userName || 'Desconocido'}
                            <button
                              type="button"
                              onClick={() => openOwnerEditor(u)}
                              className="p-1 rounded-full hover:bg-red-50 text-red-600"
                              title="Editar dueño"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.branch || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {u.devices && u.devices.length > 0 ? (
                                u.devices.map((d: any, idx: number) => (
                                  <span
                                    key={`${u.userId}-${idx}`}
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                                      isOlderThanFiveYears(d.purchaseDate)
                                        ? `${oldAssetClass} border border-red-200 bg-red-50`
                                        : 'border border-blue-200 bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    {d.code || 'SIN-CODIGO'}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground">Sin equipos</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUserForActa(u);
                                setActaModalOpen(true);
                              }}
                              className="gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Generar acta
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-end gap-4">
                <span className="text-sm text-muted-foreground">Página {pageByPerson} / {totalPagesByPerson}</span>
                <Pagination
                  page={pageByPerson}
                  totalPages={totalPagesByPerson}
                  onPageChange={(p) => setPageByPerson(p)}
                  limit={limitByPerson}
                  onLimitChange={(l) => { setLimitByPerson(l); setPageByPerson(1); }}
                  limits={[5,10,15,20]}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {ownerModalOpen && ownerSelection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-t-lg border-b border-red-100 font-semibold">
                CUIDADO: UNA VEZ CAMBIADO EL DUEÑO NO SE PODRÁ MODIFICAR POR 24 H
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dueño actual</p>
                  <p className="text-base font-semibold">{ownerSelection.userName}</p>
                  <p className="text-sm text-muted-foreground">Sucursal: {ownerSelection.branch || '-'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Nuevo dueño</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                  >
                    {people.map((p: any) => (
                      <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`}</option>
                    ))}
                  </select>
                  {ownerError && (
                    <div className="mt-2 text-xs rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                      {ownerError}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Equipos asignados</p>
                  <div className="flex flex-wrap gap-2">
                    {(ownerSelection.devices || []).map((d, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm"
                      >
                        {d.code || 'SIN-CODIGO'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOwnerModalOpen(false)} disabled={ownerSaving}>Cancelar</Button>
                  <Button variant="destructive" onClick={applyOwnerChange} disabled={ownerSaving}>
                    {ownerSaving ? 'Guardando...' : 'Confirmar cambio'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Se eliminó la previsualización; descarga directa del PDF */}
      </div>

      {/* Modal Generar Acta */}
      <GenerateActaModal
        open={actaModalOpen}
        onOpenChange={setActaModalOpen}
        user={selectedUserForActa}
      />
    </Layout>
  );
};

export default Index;
