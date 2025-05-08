
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "./App.css";

// Ensure environment variables are set
const ensureEnvVars = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

const envVarsSet = ensureEnvVars();

const queryClient = new QueryClient();

const App = () => {
  if (!envVarsSet) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded max-w-2xl w-full">
          <h2 className="text-lg font-semibold mb-2">Missing Environment Variables</h2>
          <p>
            This application requires Supabase environment variables to run properly.
            Please set the following variables in your .env file:
          </p>
          <ul className="list-disc ml-5 mt-2">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
