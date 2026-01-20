// src/App.tsx - No necesita cambios, el auto-logout está en AuthContext
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Devices from "./pages/Devices";
import People from "./pages/People";
import Assignments from "./pages/Assignments";
import Loans from "./pages/Loans";
import Catalogs from "./pages/Catalogs";
import Consumables from "./pages/Consumables";
import NotFound from "./pages/NotFound";
import Credentials from "./pages/Credentials";
import Security from "./pages/Security";
import { PrivateRoute } from "@/components/PrivateRout";
import UserDashboard from "./pages/UserDashboard";
import HumanResourcesDashboard from "./pages/HumanResourcesDashboard";
import HumanResourcesRequests from "./pages/HumanResourcesRequests";
import AdminRequests from "./pages/AdminRequests";
import UserRequests from "./pages/UserRequests";


const queryClient = new QueryClient();
const adminRoles = ['Admin', 'Administrador', 'admin'];
const hrRoles = ['Recursos Humanos', 'Human Resources', 'RRHH', ...adminRoles];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Login en la raíz y en /auth */}
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protegidas */}
            {/* Dashboard: diferenciado por rol */}
            <Route path="/dashboard" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Index />
              </PrivateRoute>
            } />
            <Route path="/user-dashboard" element={
              <PrivateRoute>
                <UserDashboard />
              </PrivateRoute>
            } />
            <Route path="/human-resources" element={
              <PrivateRoute allowedRoles={hrRoles}>
                <HumanResourcesDashboard />
              </PrivateRoute>
            } />
            <Route path="/user-requests" element={
              <PrivateRoute>
                <UserRequests />
              </PrivateRoute>
            } />
            <Route path="/human-resources/requests" element={
              <PrivateRoute allowedRoles={hrRoles}>
                <HumanResourcesRequests />
              </PrivateRoute>
            } />
            <Route path="/admin/requests" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <AdminRequests />
              </PrivateRoute>
            } />
            <Route path="/devices" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Devices />
              </PrivateRoute>
            } />
            <Route path="/people" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <People />
              </PrivateRoute>
            } />
            <Route path="/assignments" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Assignments />
              </PrivateRoute>
            } />
            <Route path="/loans" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Loans />
              </PrivateRoute>
            } />
            <Route path="/catalogs" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Catalogs />
              </PrivateRoute>
            } />
            <Route path="/consumables" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Consumables />
              </PrivateRoute>
            } />
            <Route path="/credentials" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Credentials />
              </PrivateRoute>
            } />
            <Route path="/security" element={
              <PrivateRoute allowedRoles={adminRoles}>
                <Security />
              </PrivateRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;