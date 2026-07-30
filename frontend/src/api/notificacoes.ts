import { api } from "@/lib/api-client";
import type { Notificacao } from "@/types/domain";

export async function listarNotificacoes(): Promise<Notificacao[]> {
  const { data } = await api.get("/notificacoes");
  return data;
}

export async function contarNaoLidas(): Promise<number> {
  const { data } = await api.get("/notificacoes/nao-lidas/contagem");
  return data.total;
}

export async function marcarComoLida(id: string): Promise<Notificacao> {
  const { data } = await api.patch(`/notificacoes/${id}/lida`);
  return data;
}

export async function marcarTodasComoLidas(): Promise<void> {
  await api.patch("/notificacoes/lidas");
}
