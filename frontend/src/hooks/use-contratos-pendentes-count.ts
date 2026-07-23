import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listarContratosPendentes } from "@/api/contratos";

// So o Proprietario ve/precisa desse contador (aprovar contratos e exclusivo
// dele); polling simples de 30s no lugar de websocket, dado o baixo volume
// esperado de contratos pendentes.
export function useContratosPendentesCount(): number {
  const { usuario } = useAuth();
  const { data } = useQuery({
    queryKey: ["contratos", "pendentes-aprovacao"],
    queryFn: listarContratosPendentes,
    enabled: usuario?.role === "proprietario",
    refetchInterval: 30_000,
  });
  return data?.length ?? 0;
}
