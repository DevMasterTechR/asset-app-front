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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff, Key, Copy, Check } from 'lucide-react';
import { 
  credentialsApi, 
  CreateCredentialDto, 
  UpdateCredentialDto,
  Credential 
} from '@/api/credentials';
import { peopleApi } from '@/api/people';
import { sortPeopleByName } from '@/lib/sort';
import { useSort } from '@/lib/useSort';
import { Person } from '@/data/mockDataExtended';
import CredentialFormModal from '@/components/CredentialFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

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
      setPeople(sortPeopleByName(peopleData));
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

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
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
    setFormMode('edit');
    setSelectedCredential(credential);
    setFormModalOpen(true);
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Credenciales</h1>
            <p className="text-muted-foreground mt-1">
              Gestión de credenciales de acceso a sistemas
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Credencial
          </Button>
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  displayedCredentials.map((credential) => (
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
      </div>

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