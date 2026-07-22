import { prisma } from "../../lib/prisma";
import { parsePaginacao, paginar } from "../../utils/pagination";
import type { Prisma } from "@prisma/client";

interface FiltrosAuditoria {
  usuarioId?: string;
  entidade?: string;
  acao?: string;
  page?: string;
  pageSize?: string;
}

export async function listar(filtros: FiltrosAuditoria) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.LogAuditoriaWhereInput = {
    usuarioId: filtros.usuarioId,
    entidade: filtros.entidade,
    acao: filtros.acao,
  };

  const [logs, total] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      include: { usuario: { select: { nome: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.logAuditoria.count({ where }),
  ]);

  // dadosAntes/dadosDepois foram serializados como string na gravacao; devolvemos
  // ja desserializados para o consumidor da API nao precisar fazer JSON.parse.
  const dados = logs.map((log) => ({
    ...log,
    dadosAntes: log.dadosAntes ? JSON.parse(log.dadosAntes) : null,
    dadosDepois: log.dadosDepois ? JSON.parse(log.dadosDepois) : null,
  }));

  return paginar(dados, total, paginacao);
}
