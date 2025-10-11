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
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import {
  type Ink,
  type UTPCable,
  type RJ45Connector,
  type PowerStrip,
} from '@/data/mockDataExtended';
import * as consumablesApi from '@/api/consumables';
import InkFormModal from '@/components/InkFormModal';
import UTPCableFormModal from '@/components/UTPCableFormModal';
import RJ45ConnectorFormModal from '@/components/RJ45ConnectorFormModal';
import PowerStripFormModal from '@/components/PowerStripFormModal';
import { useToast } from '@/hooks/use-toast';

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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Consumibles</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de tintas, cables, conectores y regletas
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inks" className="space-y-6">
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
              <Button onClick={() => {
                setInkModalMode('create');
                setSelectedInk(null);
                setInkModalOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Tinta
              </Button>
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
                  {filteredInks.map((ink) => (
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
          </TabsContent>

          {/* Cables UTP */}
          <TabsContent value="cables" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Cables UTP</h2>
              <Button onClick={() => {
                setCableModalMode('create');
                setSelectedCable(null);
                setCableModalOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cable
              </Button>
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
                  {filteredCables.map((cable) => (
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
          </TabsContent>

          {/* Conectores RJ45 */}
          <TabsContent value="connectors" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Conectores RJ45</h2>
              <Button onClick={() => {
                setConnectorModalMode('create');
                setSelectedConnector(null);
                setConnectorModalOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Conector
              </Button>
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
                  {filteredConnectors.map((connector) => (
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
          </TabsContent>

          {/* Regletas */}
          <TabsContent value="powerstrips" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Regletas</h2>
              <Button onClick={() => {
                setStripModalMode('create');
                setSelectedStrip(null);
                setStripModalOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Regleta
              </Button>
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
                  {filteredPowerStrips.map((strip) => (
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
          </TabsContent>
        </Tabs>
      </div>

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