import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Download } from 'lucide-react';
import {
  type Ink,
  type UTPCable,
  type RJ45Connector,
  type PowerStrip,
} from '@/data/mockDataExtended';
import * as consumablesApi from '@/api/consumables';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import InkFormModal from '@/components/InkFormModal';
import UTPCableFormModal from '@/components/UTPCableFormModal';
import RJ45ConnectorFormModal from '@/components/RJ45ConnectorFormModal';
import PowerStripFormModal from '@/components/PowerStripFormModal';
import { useToast } from '@/hooks/use-toast';
import Pagination, { DEFAULT_PAGE_SIZE } from '@/components/Pagination';

// Función para formatear fechas ISO a formato legible
function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  
  try {
    const date = new Date(isoString);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

export default function Consumables() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [inks, setInks] = useState<Ink[]>([]);
  const [utpCables, setUTPCables] = useState<UTPCable[]>([]);
  const [rj45Connectors, setRJ45Connectors] = useState<RJ45Connector[]>([]);
  const [powerStrips, setPowerStrips] = useState<PowerStrip[]>([]);

  // Modal states for Inks
  const [inkModalOpen, setInkModalOpen] = useState(false);
  const [inkModalMode, setInkModalMode] = useState<'create' | 'edit'>('create');
  const [selectedInk, setSelectedInk] = useState<Ink | null>(null);

  // Modal states for UTP Cables
  const [cableModalOpen, setCableModalOpen] = useState(false);
  const [cableModalMode, setCableModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCable, setSelectedCable] = useState<UTPCable | null>(null);

  // Modal states for RJ45 Connectors
  const [connectorModalOpen, setConnectorModalOpen] = useState(false);
  const [connectorModalMode, setConnectorModalMode] = useState<'create' | 'edit'>('create');
  const [selectedConnector, setSelectedConnector] = useState<RJ45Connector | null>(null);

  // Modal states for Power Strips
  const [stripModalOpen, setStripModalOpen] = useState(false);
  const [stripModalMode, setStripModalMode] = useState<'create' | 'edit'>('create');
  const [selectedStrip, setSelectedStrip] = useState<PowerStrip | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: string; name: string } | null>(null);

  // Report preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'inks' | 'cables' | 'connectors' | 'strips'>('all');

  // Control de pestaña actual para botón dinámico de agregar
  const [currentTab, setCurrentTab] = useState<'inks' | 'cables' | 'connectors' | 'powerstrips'>('inks');

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inksData, cablesData, connectorsData, stripsData] = await Promise.all([
        consumablesApi.getInks(),
        consumablesApi.getUTPCables(),
        consumablesApi.getRJ45Connectors(),
        consumablesApi.getPowerStrips(),
      ]);
      setInks(inksData);
      setUTPCables(cablesData);
      setRJ45Connectors(connectorsData);
      setPowerStrips(stripsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los consumibles.',
        variant: 'destructive',
      });
    }
  };

  // Filtered data
  const filteredInks = inks.filter((ink) =>
    ink.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ink.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ink.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCables = utpCables.filter((cable) =>
    cable.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cable.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConnectors = rj45Connectors.filter((connector) =>
    connector.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connector.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPowerStrips = powerStrips.filter((strip) =>
    strip.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    strip.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination (per tab)
  const [inksPage, setInksPage] = useState(1);
  const [inksLimit, setInksLimit] = useState(DEFAULT_PAGE_SIZE);
  const inksTotalPages = Math.max(1, Math.ceil(filteredInks.length / inksLimit));
  const paginatedInks = filteredInks.slice((inksPage - 1) * inksLimit, inksPage * inksLimit);

  const [cablesPage, setCablesPage] = useState(1);
  const [cablesLimit, setCablesLimit] = useState(DEFAULT_PAGE_SIZE);
  const cablesTotalPages = Math.max(1, Math.ceil(filteredCables.length / cablesLimit));
  const paginatedCables = filteredCables.slice((cablesPage - 1) * cablesLimit, cablesPage * cablesLimit);

  const [connectorsPage, setConnectorsPage] = useState(1);
  const [connectorsLimit, setConnectorsLimit] = useState(DEFAULT_PAGE_SIZE);
  const connectorsTotalPages = Math.max(1, Math.ceil(filteredConnectors.length / connectorsLimit));
  const paginatedConnectors = filteredConnectors.slice((connectorsPage - 1) * connectorsLimit, connectorsPage * connectorsLimit);

  const [stripsPage, setStripsPage] = useState(1);
  const [stripsLimit, setStripsLimit] = useState(DEFAULT_PAGE_SIZE);
  const stripsTotalPages = Math.max(1, Math.ceil(filteredPowerStrips.length / stripsLimit));
  const paginatedStrips = filteredPowerStrips.slice((stripsPage - 1) * stripsLimit, stripsPage * stripsLimit);

  // INK HANDLERS
  const handleCreateInk = async (data: consumablesApi.CreateInkDto) => {
    try {
      await consumablesApi.createInk(data);
      await loadData();
      toast({ title: 'Tinta creada', description: 'La tinta se creó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear la tinta.', variant: 'destructive' });
    }
  };

  const handleUpdateInk = async (data: consumablesApi.CreateInkDto) => {
    if (!selectedInk) return;
    try {
      await consumablesApi.updateInk(selectedInk.id, data);
      await loadData();
      toast({ title: 'Tinta actualizada', description: 'La tinta se actualizó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la tinta.', variant: 'destructive' });
    }
  };

  // CABLE HANDLERS
  const handleCreateCable = async (data: consumablesApi.CreateUTPCableDto) => {
    try {
      await consumablesApi.createUTPCable(data);
      await loadData();
      toast({ title: 'Cable creado', description: 'El cable se creó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear el cable.', variant: 'destructive' });
    }
  };

  const handleUpdateCable = async (data: consumablesApi.CreateUTPCableDto) => {
    if (!selectedCable) return;
    try {
      await consumablesApi.updateUTPCable(selectedCable.id, data);
      await loadData();
      toast({ title: 'Cable actualizado', description: 'El cable se actualizó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el cable.', variant: 'destructive' });
    }
  };

  // CONNECTOR HANDLERS
  const handleCreateConnector = async (data: consumablesApi.CreateRJ45ConnectorDto) => {
    try {
      await consumablesApi.createRJ45Connector(data);
      await loadData();
      toast({ title: 'Conector creado', description: 'El conector se creó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear el conector.', variant: 'destructive' });
    }
  };

  const handleUpdateConnector = async (data: consumablesApi.CreateRJ45ConnectorDto) => {
    if (!selectedConnector) return;
    try {
      await consumablesApi.updateRJ45Connector(selectedConnector.id, data);
      await loadData();
      toast({ title: 'Conector actualizado', description: 'El conector se actualizó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el conector.', variant: 'destructive' });
    }
  };

  // POWER STRIP HANDLERS
  const handleCreateStrip = async (data: consumablesApi.CreatePowerStripDto) => {
    try {
      await consumablesApi.createPowerStrip(data);
      await loadData();
      toast({ title: 'Regleta creada', description: 'La regleta se creó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo crear la regleta.', variant: 'destructive' });
    }
  };

  const handleUpdateStrip = async (data: consumablesApi.CreatePowerStripDto) => {
    if (!selectedStrip) return;
    try {
      await consumablesApi.updatePowerStrip(selectedStrip.id, data);
      await loadData();
      toast({ title: 'Regleta actualizada', description: 'La regleta se actualizó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la regleta.', variant: 'destructive' });
    }
  };

  // DELETE HANDLER
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      switch (deleteItem.type) {
        case 'ink':
          await consumablesApi.deleteInk(deleteItem.id);
          break;
        case 'cable':
          await consumablesApi.deleteUTPCable(deleteItem.id);
          break;
        case 'connector':
          await consumablesApi.deleteRJ45Connector(deleteItem.id);
          break;
        case 'strip':
          await consumablesApi.deletePowerStrip(deleteItem.id);
          break;
      }
      await loadData();
      toast({ title: 'Eliminado', description: 'El elemento se eliminó correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el elemento.', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteItem(null);
    }
  };

  // Report data based on filters
  const getReportData = () => {
    switch (filterType) {
      case 'inks':
        return { inks, cables: [], connectors: [], strips: [] };
      case 'cables':
        return { inks: [], cables: utpCables, connectors: [], strips: [] };
      case 'connectors':
        return { inks: [], cables: [], connectors: rj45Connectors, strips: [] };
      case 'strips':
        return { inks: [], cables: [], connectors: [], strips: powerStrips };
      default:
        return { inks, cables: utpCables, connectors: rj45Connectors, strips: powerStrips };
    }
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const reportData = getReportData();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.text('Reporte de Consumibles', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, yPosition);
    yPosition += 5;
    const filterLabel = filterType === 'all' ? 'Todos los consumibles' : filterType === 'inks' ? 'Tintas' : filterType === 'cables' ? 'Cables UTP' : filterType === 'connectors' ? 'Conectores RJ45' : 'Regletas';
    doc.text(`Filtro: ${filterLabel}`, 14, yPosition);
    yPosition += 10;

    if (reportData.inks.length > 0) {
      doc.setFontSize(14);
      doc.text('Tintas', 14, yPosition);
      yPosition += 7;
      autoTable(doc, {
        startY: yPosition,
        head: [['Marca', 'Modelo', 'Color', 'Cantidad', 'F. Compra']],
        body: reportData.inks.map((i) => [i.brand, i.model, i.color, i.quantity?.toString() || '-', formatDate(i.purchaseDate)]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.cables.length > 0) {
      if (yPosition > 250) { doc.addPage(); yPosition = 20; }
      doc.setFontSize(14);
      doc.text('Cables UTP', 14, yPosition);
      yPosition += 7;
      autoTable(doc, {
        startY: yPosition,
        head: [['Marca', 'Tipo', 'Longitud', 'Cantidad', 'F. Compra']],
        body: reportData.cables.map((c) => [c.brand, c.type, `${c.length || '-'}`, c.quantity?.toString() || '-', formatDate(c.purchaseDate)]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.connectors.length > 0) {
      if (yPosition > 250) { doc.addPage(); yPosition = 20; }
      doc.setFontSize(14);
      doc.text('Conectores RJ45', 14, yPosition);
      yPosition += 7;
      autoTable(doc, {
        startY: yPosition,
        head: [['Modelo', 'Tipo', 'Cantidad', 'F. Compra']],
        body: reportData.connectors.map((r) => [r.model, r.type, r.quantity?.toString() || '-', formatDate(r.purchaseDate)]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportData.strips.length > 0) {
      if (yPosition > 250) { doc.addPage(); yPosition = 20; }
      doc.setFontSize(14);
      doc.text('Regletas', 14, yPosition);
      yPosition += 7;
      autoTable(doc, {
        startY: yPosition,
        head: [['Marca', 'Modelo', 'Tomas', 'Cantidad', 'F. Compra']],
        body: reportData.strips.map((s) => [s.brand, s.model, s.outlets?.toString() || '-', s.quantity?.toString() || '-', formatDate(s.purchaseDate)]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`Reporte_Consumibles_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'Reporte descargado exitosamente' });
  };

  return (
    <Layout>
      <div className="p-6 md:pl-0 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consumibles</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de tintas, cables, conectores y regletas
            </p>
          </div>
        </div>

        {/* Acciones y buscador */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-end gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (currentTab === 'inks') {
                  setInkModalMode('create');
                  setSelectedInk(null);
                  setInkModalOpen(true);
                } else if (currentTab === 'cables') {
                  setCableModalMode('create');
                  setSelectedCable(null);
                  setCableModalOpen(true);
                } else if (currentTab === 'connectors') {
                  setConnectorModalMode('create');
                  setSelectedConnector(null);
                  setConnectorModalOpen(true);
                } else {
                  setStripModalMode('create');
                  setSelectedStrip(null);
                  setStripModalOpen(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {currentTab === 'inks'
                ? 'Agregar Tinta'
                : currentTab === 'cables'
                  ? 'Agregar Cable'
                  : currentTab === 'connectors'
                    ? 'Agregar Conector'
                    : 'Agregar Regleta'}
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Download className="h-4 w-4" />
              Generar Reporte PDF
            </Button>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setInksPage(1);
                setCablesPage(1);
                setConnectorsPage(1);
                setStripsPage(1);
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'inks' | 'cables' | 'connectors' | 'powerstrips')} className="space-y-6">
          <TabsList>
            <TabsTrigger value="inks">Tintas</TabsTrigger>
            <TabsTrigger value="cables">Cables UTP</TabsTrigger>
            <TabsTrigger value="connectors">RJ45</TabsTrigger>
            <TabsTrigger value="powerstrips">Regletas</TabsTrigger>
          </TabsList>

          {/* Tintas */}
          <TabsContent value="inks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tintas</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Fecha Uso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInks.map((ink) => (
                    <TableRow key={ink.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ink.brand}</p>
                          <p className="text-sm text-muted-foreground">{ink.model}</p>
                        </div>
                      </TableCell>
                      <TableCell>{ink.color}</TableCell>
                      <TableCell className="text-sm">{ink.inkType || '-'}</TableCell>
                      <TableCell className="font-medium">{ink.quantity || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(ink.purchaseDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(ink.usageDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedInk(ink);
                              setInkModalMode('edit');
                              setInkModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setDeleteItem({ id: ink.id, type: 'ink', name: `${ink.brand} ${ink.model}` });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {inksPage} / {inksTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={inksPage} totalPages={inksTotalPages} onPageChange={setInksPage} limit={inksLimit} onLimitChange={(l) => { setInksLimit(l); setInksPage(1); }} />
              </div>
            </div>
          </TabsContent>
          

          {/* Cables UTP */}
          <TabsContent value="cables" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Cables UTP</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Longitud (m)</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Fecha Uso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCables.map((cable) => (
                    <TableRow key={cable.id}>
                      <TableCell className="font-medium">{cable.brand}</TableCell>
                      <TableCell>{cable.type}</TableCell>
                      <TableCell className="text-sm">{cable.material || '-'}</TableCell>
                      <TableCell className="font-medium">{cable.lengthMeters ? `${cable.lengthMeters}m` : '-'}</TableCell>
                      <TableCell>{cable.color || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(cable.purchaseDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(cable.usageDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedCable(cable);
                              setCableModalMode('edit');
                              setCableModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setDeleteItem({ id: cable.id, type: 'cable', name: cable.brand });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {cablesPage} / {cablesTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={cablesPage} totalPages={cablesTotalPages} onPageChange={setCablesPage} limit={cablesLimit} onLimitChange={(l) => { setCablesLimit(l); setCablesPage(1); }} />
              </div>
            </div>
          </TabsContent>

          {/* Conectores RJ45 */}
          <TabsContent value="connectors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Conectores RJ45</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Fecha Uso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConnectors.map((connector) => (
                    <TableRow key={connector.id}>
                      <TableCell className="font-medium">{connector.model}</TableCell>
                      <TableCell>{connector.type}</TableCell>
                      <TableCell className="text-sm">{connector.material}</TableCell>
                      <TableCell className="font-medium">{connector.quantityUnits}</TableCell>
                      <TableCell className="text-sm">{formatDate(connector.purchaseDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(connector.usageDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedConnector(connector);
                              setConnectorModalMode('edit');
                              setConnectorModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setDeleteItem({ id: connector.id, type: 'connector', name: connector.model });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {connectorsPage} / {connectorsTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={connectorsPage} totalPages={connectorsTotalPages} onPageChange={setConnectorsPage} limit={connectorsLimit} onLimitChange={(l) => { setConnectorsLimit(l); setConnectorsPage(1); }} />
              </div>
            </div>
          </TabsContent>

          {/* Regletas */}
          <TabsContent value="powerstrips" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Regletas</h2>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca / Modelo</TableHead>
                    <TableHead>Tomas</TableHead>
                    <TableHead>Longitud (m)</TableHead>
                    <TableHead>Capacidad (W)</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead>Fecha Uso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStrips.map((strip) => (
                    <TableRow key={strip.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{strip.brand}</p>
                          <p className="text-sm text-muted-foreground">{strip.model}</p>
                        </div>
                      </TableCell>
                      <TableCell>{strip.outletCount}</TableCell>
                      <TableCell>{strip.lengthMeters}m</TableCell>
                      <TableCell className="font-medium">{strip.capacity}W</TableCell>
                      <TableCell>{strip.color}</TableCell>
                      <TableCell className="text-sm">{formatDate(strip.purchaseDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(strip.usageDate)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedStrip(strip);
                              setStripModalMode('edit');
                              setStripModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setDeleteItem({ id: strip.id, type: 'strip', name: `${strip.brand} ${strip.model}` });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground text-center">Página {stripsPage} / {stripsTotalPages}</span>
              <div className="flex-1 flex justify-end">
                <Pagination page={stripsPage} totalPages={stripsTotalPages} onPageChange={setStripsPage} limit={stripsLimit} onLimitChange={(l) => { setStripsLimit(l); setStripsPage(1); }} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-6xl rounded-lg bg-white shadow-xl my-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Previsualización del Reporte de Consumibles</h2>
                <p className="text-sm text-blue-100 mt-1">Ajusta los filtros y verifica los datos antes de descargar</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
                className="text-white hover:bg-blue-800"
              >
                ✕
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Filtros */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtros del Reporte
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-blue-900 mb-2 block">Tipo de Consumible</label>
                    <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos los consumibles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los consumibles</SelectItem>
                        <SelectItem value="inks">Tintas</SelectItem>
                        <SelectItem value="cables">Cables UTP</SelectItem>
                        <SelectItem value="connectors">Conectores RJ45</SelectItem>
                        <SelectItem value="strips">Regletas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(filterType === 'all' || filterType === 'inks') && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                    <div className="text-3xl font-bold text-blue-700">{inks.length}</div>
                    <div className="text-sm text-blue-600 font-medium mt-1">Tintas</div>
                  </div>
                )}
                {(filterType === 'all' || filterType === 'cables') && (
                  <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                    <div className="text-3xl font-bold text-indigo-700">{utpCables.length}</div>
                    <div className="text-sm text-indigo-600 font-medium mt-1">Cables UTP</div>
                  </div>
                )}
                {(filterType === 'all' || filterType === 'connectors') && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                    <div className="text-3xl font-bold text-purple-700">{rj45Connectors.length}</div>
                    <div className="text-sm text-purple-600 font-medium mt-1">Conectores RJ45</div>
                  </div>
                )}
                {(filterType === 'all' || filterType === 'strips') && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center transform transition hover:scale-105">
                    <div className="text-3xl font-bold text-amber-700">{powerStrips.length}</div>
                    <div className="text-sm text-amber-600 font-medium mt-1">Regletas</div>
                  </div>
                )}
              </div>

              {/* Vista previa */}
              {(filterType === 'all' || filterType === 'inks') && inks.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Tintas ({inks.length} registros)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left">Marca</th>
                          <th className="px-3 py-2 text-left">Modelo</th>
                          <th className="px-3 py-2 text-left">Color</th>
                          <th className="px-3 py-2 text-left">Cantidad</th>
                          <th className="px-3 py-2 text-left">F. Compra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inks.slice(0, 5).map((i, idx) => (
                          <tr key={i.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border-t font-medium">{i.brand}</td>
                            <td className="px-3 py-2 border-t">{i.model}</td>
                            <td className="px-3 py-2 border-t">{i.color}</td>
                            <td className="px-3 py-2 border-t">{i.quantity}</td>
                            <td className="px-3 py-2 border-t">{formatDate(i.purchaseDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {inks.length > 5 && (
                    <div className="bg-gray-50 px-4 py-3 border-t text-center">
                      <p className="text-xs text-gray-600">... y {inks.length - 5} tintas más en el reporte completo</p>
                    </div>
                  )}
                </div>
              )}

              {(filterType === 'all' || filterType === 'cables') && utpCables.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Cables UTP ({utpCables.length} registros)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left">Marca</th>
                          <th className="px-3 py-2 text-left">Tipo</th>
                          <th className="px-3 py-2 text-left">Longitud</th>
                          <th className="px-3 py-2 text-left">Cantidad</th>
                          <th className="px-3 py-2 text-left">F. Compra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {utpCables.slice(0, 5).map((c, idx) => (
                          <tr key={c.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border-t font-medium">{c.brand}</td>
                            <td className="px-3 py-2 border-t">{c.type}</td>
                            <td className="px-3 py-2 border-t">{c.length ?? '-'}</td>
                            <td className="px-3 py-2 border-t">{c.quantity}</td>
                            <td className="px-3 py-2 border-t">{formatDate(c.purchaseDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {utpCables.length > 5 && (
                    <div className="bg-gray-50 px-4 py-3 border-t text-center">
                      <p className="text-xs text-gray-600">... y {utpCables.length - 5} cables más en el reporte completo</p>
                    </div>
                  )}
                </div>
              )}

              {(filterType === 'all' || filterType === 'connectors') && rj45Connectors.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Conectores RJ45 ({rj45Connectors.length} registros)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left">Modelo</th>
                          <th className="px-3 py-2 text-left">Tipo</th>
                          <th className="px-3 py-2 text-left">Cantidad</th>
                          <th className="px-3 py-2 text-left">F. Compra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rj45Connectors.slice(0, 5).map((r, idx) => (
                          <tr key={r.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border-t font-medium">{r.model}</td>
                            <td className="px-3 py-2 border-t">{r.type}</td>
                            <td className="px-3 py-2 border-t">{r.quantity}</td>
                            <td className="px-3 py-2 border-t">{formatDate(r.purchaseDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rj45Connectors.length > 5 && (
                    <div className="bg-gray-50 px-4 py-3 border-t text-center">
                      <p className="text-xs text-gray-600">... y {rj45Connectors.length - 5} conectores más en el reporte completo</p>
                    </div>
                  )}
                </div>
              )}

              {(filterType === 'all' || filterType === 'strips') && powerStrips.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm mb-6">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Regletas ({powerStrips.length} registros)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left">Marca</th>
                          <th className="px-3 py-2 text-left">Modelo</th>
                          <th className="px-3 py-2 text-left">Tomas</th>
                          <th className="px-3 py-2 text-left">Cantidad</th>
                          <th className="px-3 py-2 text-left">F. Compra</th>
                        </tr>
                      </thead>
                      <tbody>
                        {powerStrips.slice(0, 5).map((s, idx) => (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border-t font-medium">{s.brand}</td>
                            <td className="px-3 py-2 border-t">{s.model}</td>
                            <td className="px-3 py-2 border-t">{s.outletCount}</td>
                            <td className="px-3 py-2 border-t">{s.quantity}</td>
                            <td className="px-3 py-2 border-t">{formatDate(s.purchaseDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {powerStrips.length > 5 && (
                    <div className="bg-gray-50 px-4 py-3 border-t text-center">
                      <p className="text-xs text-gray-600">... y {powerStrips.length - 5} regletas más en el reporte completo</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancelar</Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { downloadReport(); setPreviewOpen(false); }}>
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <InkFormModal
        open={inkModalOpen}
        onOpenChange={setInkModalOpen}
        onSave={inkModalMode === 'create' ? handleCreateInk : handleUpdateInk}
        ink={selectedInk}
        mode={inkModalMode}
      />

      <UTPCableFormModal
        open={cableModalOpen}
        onOpenChange={setCableModalOpen}
        onSave={cableModalMode === 'create' ? handleCreateCable : handleUpdateCable}
        cable={selectedCable}
        mode={cableModalMode}
      />

      <RJ45ConnectorFormModal
        open={connectorModalOpen}
        onOpenChange={setConnectorModalOpen}
        onSave={connectorModalMode === 'create' ? handleCreateConnector : handleUpdateConnector}
        connector={selectedConnector}
        mode={connectorModalMode}
      />

      <PowerStripFormModal
        open={stripModalOpen}
        onOpenChange={setStripModalOpen}
        onSave={stripModalMode === 'create' ? handleCreateStrip : handleUpdateStrip}
        powerStrip={selectedStrip}
        mode={stripModalMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente: <strong>{deleteItem?.name}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}