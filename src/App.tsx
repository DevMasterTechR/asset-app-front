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
import Catalogs from "./pages/Catalogs";
import Consumables from "./pages/Consumables";
import NotFound from "./pages/NotFound";
import Credentials from "./pages/Credentials";
import { PrivateRoute } from "@/components/PrivateRout"



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
            {/* Pública */}
            <Route path="/auth" element={<Auth />} />

            {/* Protegidas */}
            <Route path="/" element={
              <PrivateRoute>
                <Index />
              </PrivateRoute>
            } />
            <Route path="/devices" element={
              <PrivateRoute>
                <Devices />
              </PrivateRoute>
            } />
            <Route path="/people" element={
              <PrivateRoute>
                <People />
              </PrivateRoute>
            } />
            <Route path="/assignments" element={
              <PrivateRoute>
                <Assignments />
              </PrivateRoute>
            } />
            <Route path="/catalogs" element={
              <PrivateRoute>
                <Catalogs />
              </PrivateRoute>
            } />
            <Route path="/consumables" element={
              <PrivateRoute>
                <Consumables />
              </PrivateRoute>
            } />
            <Route path="/credentials" element={
              <PrivateRoute>
                <Credentials />
              </PrivateRoute>
            } />

            {/* Ruta 404 */}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
