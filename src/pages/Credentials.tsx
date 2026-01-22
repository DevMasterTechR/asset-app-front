// src/pages/Credentials.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff, Key, Copy, Check, Download } from 'lucide-react';
import { 
  credentialsApi, 
  CreateCredentialDto, 
  UpdateCredentialDto,
  Credential 
} from '@/api/credentials';
import { peopleApi } from '@/api/people';
import { sortPeopleByName } from '@/lib/sort';
import { extractArray } from '@/lib/extractData';
import { useSort } from '@/lib/useSort';
import { Person } from '@/data/mockDataExtended';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CredentialFormModal from '@/components/CredentialFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import Pagination, { DEFAULT_PAGE_SIZE } from '@/components/Pagination';

const systemColorMap = {
  erp: 'default' as const,
  crm: 'secondary' as const,
  email: 'outline' as const,
  glpi: 'success' as const,
};

const systemLabelMap = {
  erp: 'ERP',
  crm: 'CRM',
  email: 'Email',
  glpi: 'GLPI',
};

function CredentialsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [copiedPasswords, setCopiedPasswords] = useState<Record<number, boolean>>({});
  
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterPersonId, setFilterPersonId] = useState<'all' | string>('all');
  const [filterSystem, setFilterSystem] = useState<'all' | keyof typeof systemLabelMap>('all');
  const [personFilterSearch, setPersonFilterSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [credentialsData, peopleData] = await Promise.all([
        credentialsApi.getAll(),
        peopleApi.getAll(),
      ]);
      
      console.log('✅ Credenciales cargadas:', credentialsData);
      console.log('✅ Personas cargadas:', peopleData);
      
      setCredentials(credentialsData);
      const peopleList = extractArray<Person>(peopleData);
      setPeople(sortPeopleByName(peopleList));
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (personId: number): string => {
    const person = people.find(p => Number(p.id) === personId);
    return person ? `${person.firstName} ${person.lastName}` : 'Desconocido';
  };

  const filteredCredentials = credentials.filter((cred) => {
    const personName = getPersonName(cred.personId).toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      personName.includes(search) ||
      cred.username.toLowerCase().includes(search) ||
      cred.system.toLowerCase().includes(search)
    );
  });

  const sort = useSort();

  const displayedCredentials = sort.apply(filteredCredentials, {
    person: (c: any) => getPersonName(c.personId).toString(),
    system: (c: any) => c.system || '',
    username: (c: any) => c.username || '',
  });

  // Pagination (client-side)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(displayedCredentials.length / limit));
  const paginatedCredentials = displayedCredentials.slice((page - 1) * limit, page * limit);

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getReportData = () => {
    return credentials.filter((cred) => {
      const matchPerson = filterPersonId === 'all' || String(cred.personId) === filterPersonId;
      const matchSystem = filterSystem === 'all' || cred.system === filterSystem;
      return matchPerson && matchSystem;
    });
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    const data = getReportData();
    let y = 20;

    doc.setFontSize(18);
    doc.text('Reporte de Credenciales', 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, y);
    y += 5;
    const personLabel = filterPersonId === 'all' ? 'Todas las personas' : getPersonName(Number(filterPersonId));
    const systemLabel = filterSystem === 'all' ? 'Todos los sistemas' : systemLabelMap[filterSystem];
    doc.text(`Persona: ${personLabel}`, 14, y);
    y += 5;
    doc.text(`Sistema: ${systemLabel}`, 14, y);
    y += 10;

    if (data.length === 0) {
      doc.text('No hay datos para los filtros seleccionados.', 14, y);
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Persona', 'Sistema', 'Usuario', 'Contraseña', 'Notas']],
        body: data.map((cred) => [
          getPersonName(cred.personId),
          systemLabelMap[cred.system],
          cred.username,
          cred.password,
          cred.notes || '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`Reporte_Credenciales_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'Reporte descargado exitosamente' });
  };

  const copyPasswordToClipboard = async (password: string, id: number) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPasswords(prev => ({ ...prev, [id]: true }));
      
      toast({
        title: 'Copiado',
        description: 'Contraseña copiada al portapapeles',
      });

      setTimeout(() => {
        setCopiedPasswords(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar la contraseña',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedCredential(null);
    setFormModalOpen(true);
  };

  const handleEdit = (credential: Credential) => {
    // Agregar datos de la persona al credential para que el modal los tenga de inmediato
    const person = people.find(p => Number(p.id) === Number(credential.personId));
    const credentialWithPerson = person 
      ? { ...credential, person } 
      : credential;
    
    // Establecer todo en el orden correcto
    setSelectedCredential(credentialWithPerson as Credential);
    setFormMode('edit');
    // Abrir el modal en el siguiente tick para asegurar que el estado se haya actualizado
    setTimeout(() => {
      setFormModalOpen(true);
    }, 0);
  };

  const handleDeleteClick = (credential: Credential) => {
    setSelectedCredential(credential);
    setDeleteModalOpen(true);
  };

  const handleSave = async (data: CreateCredentialDto) => {
    try {
      if (formMode === 'create') {
        await credentialsApi.create(data);
        toast({
          title: 'Éxito',
          description: 'Credencial creada correctamente',
        });
      } else if (selectedCredential) {
        await credentialsApi.update(selectedCredential.id, data);
        toast({
          title: 'Éxito',
          description: 'Credencial actualizada correctamente',
        });
      }
      
      await loadData();
      setFormModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar la credencial',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedCredential) return;

    try {
      await credentialsApi.delete(selectedCredential.id);
      toast({
        title: 'Éxito',
        description: 'Credencial eliminada correctamente',
      });
      await loadData();
      setDeleteModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar la credencial',
        variant: 'destructive',
      });
    }
  };

  const reportData = getReportData();

  return (
    <Layout>
      <div className="p-6 md:pl-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Credenciales</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de credenciales de acceso a sistemas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="destructive" className="gap-2" onClick={() => setPreviewOpen(true)}>
              <Download className="h-4 w-4" />
              Generar Reporte PDF
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Credencial
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por persona, usuario o sistema..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{displayedCredentials.length}</p>
                <p className="text-sm text-muted-foreground">Credenciales</p>
              </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg bg-card">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('person')}>Persona {sort.key === 'person' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('system')}>Sistema {sort.key === 'system' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => sort.toggle('username')}>Usuario {sort.key === 'username' ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</TableHead>
                  <TableHead>Contraseña</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCredentials.length > 0 ? (
                  paginatedCredentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">
                        {getPersonName(credential.personId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={systemColorMap[credential.system]}>
                          {systemLabelMap[credential.system]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {credential.username}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {showPasswords[credential.id] 
                              ? credential.password 
                              : '••••••••'
                            }
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePasswordVisibility(credential.id)}
                            title={showPasswords[credential.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showPasswords[credential.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyPasswordToClipboard(credential.password, credential.id)}
                            title="Copiar contraseña"
                          >
                            {copiedPasswords[credential.id] ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {credential.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEdit(credential)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteClick(credential)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No se encontraron credenciales
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm 
                          ? 'Intenta con otros términos de búsqueda' 
                          : 'Comienza agregando una credencial'}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Pagination */}
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
            />
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl my-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Previsualización del Reporte de Credenciales</h2>
                <p className="text-sm text-blue-100 mt-1">Filtra por persona o sistema y valida los datos antes de exportar</p>
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

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                <h3 className="text-sm font-bold text-blue-900 mb-3">Filtros del reporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-blue-900 mb-2 block">Persona</label>
                    <Select value={filterPersonId} onValueChange={(v) => setFilterPersonId(v)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todas las personas" />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-3 py-2">
                          <Input
                            placeholder="Buscar persona..."
                            value={personFilterSearch}
                            onChange={(e) => setPersonFilterSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <SelectItem value="all">Todas las personas</SelectItem>
                        {people
                          .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(personFilterSearch.toLowerCase()))
                          .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-900 mb-2 block">Sistema</label>
                    <Select value={filterSystem} onValueChange={(v) => setFilterSystem(v as 'all' | keyof typeof systemLabelMap)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Todos los sistemas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los sistemas</SelectItem>
                        {Object.entries(systemLabelMap).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-700">{reportData.length}</div>
                  <div className="text-sm text-blue-600 font-medium mt-1">Credenciales filtradas</div>
                </div>
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-indigo-700">{new Set(reportData.map((c) => c.personId)).size}</div>
                  <div className="text-sm text-indigo-600 font-medium mt-1">Personas</div>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-amber-700">{new Set(reportData.map((c) => c.system)).size}</div>
                  <div className="text-sm text-amber-600 font-medium mt-1">Sistemas</div>
                </div>
              </div>

              {reportData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b">
                    <h3 className="text-sm font-semibold text-gray-700">Credenciales ({reportData.length} registros)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-blue-600 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left">Persona</th>
                          <th className="px-3 py-2 text-left">Sistema</th>
                          <th className="px-3 py-2 text-left">Usuario</th>
                          <th className="px-3 py-2 text-left">Contraseña</th>
                          <th className="px-3 py-2 text-left">Notas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.slice(0, 8).map((cred, idx) => (
                          <tr key={cred.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="px-3 py-2 border-t font-medium">{getPersonName(cred.personId)}</td>
                            <td className="px-3 py-2 border-t">{systemLabelMap[cred.system]}</td>
                            <td className="px-3 py-2 border-t">{cred.username}</td>
                            <td className="px-3 py-2 border-t">{cred.password}</td>
                            <td className="px-3 py-2 border-t">{cred.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.length > 8 && (
                    <div className="bg-gray-50 px-4 py-3 border-t text-center">
                      <p className="text-xs text-gray-600">... y {reportData.length - 8} registros más en el reporte completo</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-blue-200 rounded-lg p-6 text-center text-sm text-muted-foreground">
                  No hay datos para los filtros seleccionados.
                </div>
              )}
            </div>

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

      <CredentialFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        credential={selectedCredential}
        mode={formMode}
        people={people}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="¿Eliminar credencial?"
        description="Esta acción no se puede deshacer. La credencial será eliminada permanentemente."
        itemName={selectedCredential ? `${selectedCredential.username} - ${systemLabelMap[selectedCredential.system]}` : undefined}
      />
    </Layout>
  );
}

export default CredentialsPage;