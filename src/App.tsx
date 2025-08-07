import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./components/UpdatePassword";
import ResetPassword from "./components/ResetPassword";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/update-password" element={
                <div className="min-h-screen flex items-center justify-center p-4">
                  <UpdatePassword />
                </div>
              } />
              <Route path="/reset-password" element={
                <div className="min-h-screen flex items-center justify-center p-4">
                  <ResetPassword email="" onSuccess={() => {}} onCancel={() => {}} />
                </div>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
