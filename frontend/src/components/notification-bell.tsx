import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from "@/api/notificacoes";
import { useNotificacoesCount } from "@/hooks/use-notificacoes-count";
import { formatarDataHora } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notificacao } from "@/types/domain";

// Mapa entidade -> rota: novos tipos de notificacao so precisam adicionar uma
// entrada aqui para ficarem clicaveis (nenhuma mudanca no resto do componente).
const ROTA_POR_ENTIDADE: Record<string, (id: string) => string> = {
  Contrato: (id) => `/contratos/${id}`,
};

export function NotificationBell() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);

  // Badge sempre faz polling leve (so a contagem); a lista completa so e
  // buscada quando o dropdown e aberto, pra nao pagar o custo dela a cada 30s.
  const naoLidasBadge = useNotificacoesCount();

  const { data: notificacoes } = useQuery({
    queryKey: ["notificacoes", "recentes"],
    queryFn: listarNotificacoes,
    enabled: Boolean(usuario) && aberto,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  }

  const mutMarcarLida = useMutation({
    mutationFn: (id: string) => marcarComoLida(id),
    onSuccess: invalidar,
  });

  const mutMarcarTodas = useMutation({
    mutationFn: marcarTodasComoLidas,
    onSuccess: invalidar,
  });

  function abrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida) mutMarcarLida.mutate(notificacao.id);
    if (notificacao.entidade && notificacao.entidadeId) {
      const rota = ROTA_POR_ENTIDADE[notificacao.entidade];
      if (rota) navigate(rota(notificacao.entidadeId));
    }
  }

  if (!usuario) return null;

  return (
    <DropdownMenu onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-[18px] w-[18px]" />
          {naoLidasBadge > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {naoLidasBadge > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                mutMarcarTodas.mutate();
              }}
              disabled={mutMarcarTodas.isPending}
              className="flex items-center gap-1 text-xs font-normal text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(!notificacoes || notificacoes.length === 0) && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notificacoes?.map((notificacao) => (
            <DropdownMenuItem
              key={notificacao.id}
              onClick={() => abrirNotificacao(notificacao)}
              className={cn("flex flex-col items-start gap-0.5 whitespace-normal py-2", !notificacao.lida && "bg-primary/5")}
            >
              <div className="flex w-full items-center gap-1.5">
                {!notificacao.lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="text-sm font-medium">{notificacao.titulo}</span>
              </div>
              <span className="text-xs text-muted-foreground">{notificacao.mensagem}</span>
              <span className="text-[11px] text-muted-foreground">{formatarDataHora(notificacao.createdAt)}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
