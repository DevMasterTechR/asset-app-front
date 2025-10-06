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
import { Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff, Key } from 'lucide-react';
import { getPersonName } from '@/data/mockDataExtended';
import { 
  credentialsApi, 
  initializeMockCredentials, 
  CreateCredentialDto, 
  UpdateCredentialDto,
  Credential 
} from '@/api/credentials';
import { mockCredentials } from '@/data/mockCredentials';
import CredentialFormModal from '@/components/CredentialFormModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

const systemColorMap = {
  ERP: 'default' as const,
  CRM: 'secondary' as const,
  Email: 'outline' as const,
  GLPI: 'success' as const,
};

export default function Credentials() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Estados para modales
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    initializeMockCredentials(mockCredentials);
    
    const response = await credentialsApi.getAll();
    if (response.success && response.data) {
      setCredentials(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'No se pudieron cargar las credenciales',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const filteredCredentials = credentials.filter((cred) => {
    const personName = getPersonName(cred.personId).toLowerCase();
    return (
      personName.includes(searchTerm.toLowerCase()) ||
      cred.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.system.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ========== CRUD HANDLERS ==========

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
    let response;
    
    if (formMode === 'create') {
      response = await credentialsApi.create(data);
    } else if (selectedCredential) {
      const updateData: UpdateCredentialDto = { ...data, id: selectedCredential.id };
      response = await credentialsApi.update(updateData);
    }

    if (response?.success) {
      toast({
        title: 'Éxito',
        description: formMode === 'create' 
          ? 'Credencial creada correctamente'
          : 'Credencial actualizada correctamente',
      });
      await loadCredentials();
      setFormModalOpen(false);
    } else {
      toast({
        title: 'Error',
        description: response?.error || 'No se pudo guardar la credencial',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCredential) return;

    const response = await credentialsApi.delete(selectedCredential.id);

    if (response.success) {
      toast({
        title: 'Éxito',
        description: 'Credencial eliminada correctamente',
      });
      await loadCredentials();
    } else {
      toast({
        title: 'Error',
        description: response.error || 'No se pudo eliminar la credencial',
        variant: 'destructive',
      });
    }
  };

  // Agrupar credenciales por persona
  const credentialsByPerson = filteredCredentials.reduce((acc, cred) => {
    const personName = getPersonName(cred.personId);
    if (!acc[personName]) {
      acc[personName] = [];
    }
    acc[personName].push(cred);
    return acc;
  }, {} as Record<string, Credential[]>);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
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

        {/* Search and Stats */}
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
              <p className="text-2xl font-bold">{filteredCredentials.length}</p>
              <p className="text-sm text-muted-foreground">Credenciales</p>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="border rounded-lg bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Contraseña</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-medium">
                        {getPersonName(credential.personId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={systemColorMap[credential.system]}>
                          {credential.system}
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
                          >
                            {showPasswords[credential.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
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
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredCredentials.length === 0 && (
              <div className="text-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron credenciales</h3>
                <p className="text-muted-foreground">
                  Intenta con otros términos de búsqueda
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      <CredentialFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        onSave={handleSave}
        credential={selectedCredential}
        mode={formMode}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="¿Eliminar credencial?"
        description="Esta acción no se puede deshacer. La credencial será eliminada permanentemente."
        itemName={selectedCredential ? `${selectedCredential.username} - ${selectedCredential.system}` : undefined}
      />
    </Layout>
  );
}