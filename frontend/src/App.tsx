import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Erros 4xx (ex: 404 "sem contrato ativo") nunca vao ter sucesso numa
      // retentativa - so vale re-tentar falhas de rede/servidor (5xx).
      retry: (falhas, erro) => {
        if (axios.isAxiosError(erro) && erro.response && erro.response.status < 500) return false;
        return falhas < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
