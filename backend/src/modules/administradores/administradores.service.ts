import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { criarUsuarioComSenhaTemporaria, resetarSenhaUsuario, sanitizeUsuario } from "../usuarios/usuarios.service";
import type {
  criarAdministradorSchema,
  atualizarAdministradorSchema,
  atualizarPermissoesSchema,
} from "./administradores.schema";
import type { z } from "zod";

export async function listar() {
  const administradores = await prisma.usuario.findMany({
    where: { role: "administrador" },
    include: { permissaoAdministrador: true, _count: { select: { imoveisVinculados: true } } },
    orderBy: { nome: "asc" },
  });
  // Nunca expor pagamentosComoAdmin aqui: o proprio administrador nao pode
  // ver a propria mensalidade, entao essa lista jamais inclui esse dado.
  return administradores.map((admin) => {
    const { _count, ...resto } = admin;
    return { ...sanitizeUsuario(resto), totalImoveisVinculados: _count.imoveisVinculados };
  });
}

export async function buscarPorIdOuFalhar(id: string) {
  const administrador = await prisma.usuario.findUnique({
    where: { id },
    include: { permissaoAdministrador: true },
  });
  if (!administrador || administrador.role !== "administrador") {
    throw new AppError("Administrador nao encontrado", 404);
  }
  return sanitizeUsuario(administrador);
}

export async function criar(data: z.infer<typeof criarAdministradorSchema>) {
  return prisma.$transaction(async (tx) => {
    const { usuario, senhaTemporaria } = await criarUsuarioComSenhaTemporaria(
      data.nome,
      data.email,
      "administrador",
      tx,
    );

    const permissao = await tx.permissaoAdministrador.create({
      data: { usuarioId: usuario.id },
    });

    return {
      administrador: { ...sanitizeUsuario(usuario), permissaoAdministrador: permissao },
      credenciaisTemporarias: { email: usuario.email, senhaTemporaria },
    };
  });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarAdministradorSchema>) {
  await buscarPorIdOuFalhar(id);
  const usuario = await prisma.usuario.update({ where: { id }, data });
  return sanitizeUsuario(usuario);
}

export async function desativar(id: string) {
  await buscarPorIdOuFalhar(id);
  await prisma.usuario.update({ where: { id }, data: { ativo: false, desativadoEm: new Date() } });
}

export async function reativar(id: string) {
  await buscarPorIdOuFalhar(id);
  await prisma.usuario.update({ where: { id }, data: { ativo: true, desativadoEm: null } });
}

async function possuiAcoesRegistradas(usuarioId: string): Promise<boolean> {
  const [logs, contratosCriados, contratosAprovados, recibos, pagamentosComoAdmin] = await Promise.all([
    prisma.logAuditoria.count({ where: { usuarioId } }),
    prisma.contrato.count({ where: { criadoPorId: usuarioId } }),
    prisma.contrato.count({ where: { aprovadoPorId: usuarioId } }),
    prisma.reciboPdf.count({ where: { geradoPorId: usuarioId } }),
    prisma.pagamentoAdministrador.count({ where: { administradorId: usuarioId } }),
  ]);
  return logs + contratosCriados + contratosAprovados + recibos + pagamentosComoAdmin > 0;
}

// Hard delete: so permitido se o administrador nunca deixou rastro (logs,
// contratos, recibos, mensalidades). Vinculos de imovel e permissoes sao
// apenas configuracao (cascade automatico via onDelete: Cascade no schema),
// nao contam como "acao registrada".
export async function excluir(id: string) {
  await buscarPorIdOuFalhar(id);
  if (await possuiAcoesRegistradas(id)) {
    throw new AppError(
      "Este Administrador possui ações registradas no sistema (contratos, recibos, mensalidades, auditoria) e não pode ser excluído definitivamente. Desative-o em vez disso.",
      409,
    );
  }
  await prisma.usuario.delete({ where: { id } });
}

export async function resetarSenha(id: string) {
  const administrador = await buscarPorIdOuFalhar(id);
  const { senhaTemporaria } = await resetarSenhaUsuario(id);
  return { email: administrador.email, senhaTemporaria };
}

export async function obterPermissoes(id: string) {
  await buscarPorIdOuFalhar(id);
  const permissao = await prisma.permissaoAdministrador.findUnique({ where: { usuarioId: id } });
  if (!permissao) throw new AppError("Permissoes nao encontradas para este administrador", 404);
  return permissao;
}

export async function atualizarPermissoes(id: string, data: z.infer<typeof atualizarPermissoesSchema>) {
  await buscarPorIdOuFalhar(id);
  return prisma.permissaoAdministrador.update({ where: { usuarioId: id }, data });
}

// ── Vinculo de imoveis ────────────────────────────────────────────────────

export async function listarImoveisVinculados(administradorId: string) {
  await buscarPorIdOuFalhar(administradorId);
  const vinculos = await prisma.adminImovel.findMany({
    where: { administradorId },
    include: { imovel: { include: { tipoImovel: true } } },
    orderBy: { createdAt: "asc" },
  });
  return vinculos.map((v) => v.imovel);
}

export async function vincularImovel(administradorId: string, imovelId: string) {
  await buscarPorIdOuFalhar(administradorId);
  const imovel = await prisma.imovel.findUnique({ where: { id: imovelId } });
  if (!imovel) throw new AppError("Imovel nao encontrado", 400);

  return prisma.adminImovel.upsert({
    where: { administradorId_imovelId: { administradorId, imovelId } },
    update: {},
    create: { administradorId, imovelId },
  });
}

export async function desvincularImovel(administradorId: string, imovelId: string) {
  await prisma.adminImovel.deleteMany({ where: { administradorId, imovelId } });
}

// Substitui a lista inteira de vinculos pelo conjunto informado (usado pela
// tela de edicao com checklist "selecionar todos/limpar").
export async function substituirImoveisVinculados(administradorId: string, imovelIds: string[]) {
  await buscarPorIdOuFalhar(administradorId);

  if (imovelIds.length > 0) {
    const totalEncontrados = await prisma.imovel.count({ where: { id: { in: imovelIds } } });
    if (totalEncontrados !== imovelIds.length) {
      throw new AppError("Um ou mais imoveis informados nao existem", 400);
    }
  }

  await prisma.$transaction([
    prisma.adminImovel.deleteMany({ where: { administradorId } }),
    prisma.adminImovel.createMany({
      data: imovelIds.map((imovelId) => ({ administradorId, imovelId })),
    }),
  ]);

  return listarImoveisVinculados(administradorId);
}
