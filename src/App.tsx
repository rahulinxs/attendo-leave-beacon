import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { SessionProvider } from "./contexts/SessionContext";
import { CommissionProvider } from "./contexts/CommissionContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";
import ResetPassword from "./pages/ResetPassword";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ShaderBackground from "@/components/ui/shader-background";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CompanyProvider>
            <SessionProvider>
              <CommissionProvider>
                <div className="relative z-10">
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/update-password" element={
                      <AuthProvider>
                        <div className="auth-window">
                          <ShaderBackground />
                          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                            <UpdatePassword />
                          </div>
                        </div>
                      </AuthProvider>
                    } />
                    <Route path="/reset-password" element={
                      <AuthProvider>
                        <div className="auth-window">
                          <ShaderBackground />
                          <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                            <ResetPassword />
                          </div>
                        </div>
                      </AuthProvider>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
                </div>
              </CommissionProvider>
            </SessionProvider>
          </CompanyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
