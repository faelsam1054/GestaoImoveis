import type { Request } from "express";
import { prisma } from "../lib/prisma";

interface RegistrarAuditoriaParams {
  usuarioId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  dadosAntes?: unknown;
  dadosDepois?: unknown;
  ip?: string | null;
}

// Registro de auditoria e chamado explicitamente pelos services/controllers
// nas acoes sensiveis (login, CRUDs, mudanca de permissao etc). Um middleware
// generico nao consegue capturar o "antes/depois" de forma confiavel sem
// acoplar-se a cada rota, entao preferimos a chamada direta e explicita.
export async function registrarAuditoria(params: RegistrarAuditoriaParams): Promise<void> {
  await prisma.logAuditoria.create({
    data: {
      usuarioId: params.usuarioId ?? null,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      dadosAntes: params.dadosAntes !== undefined ? JSON.stringify(params.dadosAntes) : null,
      dadosDepois: params.dadosDepois !== undefined ? JSON.stringify(params.dadosDepois) : null,
      ip: params.ip ?? null,
    },
  });
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? null;
}
