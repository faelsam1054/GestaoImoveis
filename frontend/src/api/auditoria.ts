import { api } from "@/lib/api-client";
import type { LogAuditoria, Paginado } from "@/types/domain";

export interface FiltrosAuditoria {
  usuarioId?: string;
  entidade?: string;
  acao?: string;
  page?: number;
}

export async function listarAuditoria(filtros: FiltrosAuditoria = {}): Promise<Paginado<LogAuditoria>> {
  const { data } = await api.get("/auditoria", { params: { ...filtros, pageSize: 30 } });
  return data;
}
