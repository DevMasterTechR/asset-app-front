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



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/people" element={<People />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/catalogs" element={<Catalogs />} />
            <Route path="/consumables" element={<Consumables />} />
            <Route path="/credentials" element={<Credentials />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
