import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import {
  mockInks,
  mockUTPCables,
  mockRJ45Connectors,
  mockPowerStrips,
  type Ink,
  type UTPCable,
  type RJ45Connector,
  type PowerStrip,
} from '@/data/mockDataExtended';

export default function Consumables() {
  const [searchTerm, setSearchTerm] = useState('');
  const [inks] = useState<Ink[]>(mockInks);
  const [utpCables] = useState<UTPCable[]>(mockUTPCables);
  const [rj45Connectors] = useState<RJ45Connector[]>(mockRJ45Connectors);
  const [powerStrips] = useState<PowerStrip[]>(mockPowerStrips);

  const filteredInks = inks.filter((ink) =>
    ink.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ink.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ink.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCables = utpCables.filter((cable) =>
    cable.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConnectors = rj45Connectors.filter((connector) =>
    connector.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPowerStrips = powerStrips.filter((strip) =>
    strip.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    strip.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Button>
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
                      <TableCell className="text-sm">{ink.inkType}</TableCell>
                      <TableCell className="font-medium">{ink.quantity}</TableCell>
                      <TableCell className="text-sm">{ink.purchaseDate || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
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
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cable
              </Button>
            </div>

            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Longitud (m)</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCables.map((cable) => (
                    <TableRow key={cable.id}>
                      <TableCell className="font-medium">{cable.brand}</TableCell>
                      <TableCell className="capitalize">{cable.type}</TableCell>
                      <TableCell className="text-sm">{cable.material}</TableCell>
                      <TableCell className="font-medium">{cable.lengthMeters}m</TableCell>
                      <TableCell>{cable.color}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
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
              <Button>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
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
              <Button>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
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
    </Layout>
  );
}
