import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { contarNaoLidas } from "@/api/notificacoes";

// Qualquer role autenticado pode ter notificacoes (o tipo de notificacao e
// extensivel - hoje so existe CONTRATO_REJEITADO, restrito a administrador,
// mas o contador nao presume isso). Polling simples de 30s, mesmo padrao do
// use-contratos-pendentes-count.
export function useNotificacoesCount(): number {
  const { usuario } = useAuth();
  const { data } = useQuery({
    queryKey: ["notificacoes", "nao-lidas-contagem"],
    queryFn: contarNaoLidas,
    enabled: Boolean(usuario),
    refetchInterval: 30_000,
  });
  return data ?? 0;
}
