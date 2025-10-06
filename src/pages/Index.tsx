import { useState } from "react";
import Layout from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { DevicesTable } from "@/components/DevicesTable";
import { UserAssignmentsTable } from "@/components/UserAssignmentsTable";
import { mockDevices, mockUserAssignments } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Laptop, Users, Package, AlertCircle, Search } from "lucide-react";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const stats = {
    total: mockDevices.length,
    assigned: mockDevices.filter((d) => d.status === "assigned").length,
    available: mockDevices.filter((d) => d.status === "available").length,
    maintenance: mockDevices.filter((d) => d.status === "maintenance").length,
  };

  const filteredDevices = mockDevices.filter(
    (device) =>
      device.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = mockUserAssignments.filter(
    (user) =>
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Dispositivos"
            value={stats.total}
            icon={Package}
            description="En inventario"
          />
          <StatsCard
            title="Asignados"
            value={stats.assigned}
            icon={Users}
            description="En uso activo"
            variant="default"
          />
          <StatsCard
            title="Disponibles"
            value={stats.available}
            icon={Laptop}
            description="Para asignar"
            variant="success"
          />
          <StatsCard
            title="Mantenimiento"
            value={stats.maintenance}
            icon={AlertCircle}
            description="En reparación"
            variant="warning"
          />
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar dispositivos, usuarios..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tables Tabs */}
        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="users">Asignaciones por Usuario</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">
                Lista de Dispositivos
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredDevices.length} dispositivos
              </span>
            </div>
            <DevicesTable devices={filteredDevices} />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">
                Dispositivos por Usuario
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredUsers.length} usuarios
              </span>
            </div>
            <UserAssignmentsTable assignments={filteredUsers} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
