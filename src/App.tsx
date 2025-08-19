import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { SessionProvider } from "./contexts/SessionContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";
import ResetPassword from "./pages/ResetPassword";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <SessionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/update-password" element={
                    <AuthProvider>
                      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                        <UpdatePassword />
                      </div>
                    </AuthProvider>
                  } />
                  <Route path="/reset-password" element={
                    <AuthProvider>
                      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                        <ResetPassword />
                      </div>
                    </AuthProvider>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </SessionProvider>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
