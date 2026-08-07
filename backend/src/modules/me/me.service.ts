import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { sanitizeUsuario } from "../usuarios/usuarios.service";
import { inicioDeHoje } from "../../utils/data";
import type { Role } from "../../types/rbac";
import type { atualizarPerfilSchema, relatarProblemaSchema } from "./me.schema";
import type { z } from "zod";

export async function obterPerfil(usuarioId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { inquilino: true },
  });
  if (!usuario) throw new AppError("Usuario nao encontrado", 404);
  return sanitizeUsuario(usuario);
}

export async function atualizarPerfil(usuarioId: string, role: Role, data: z.infer<typeof atualizarPerfilSchema>) {
  return prisma.$transaction(async (tx) => {
    if (data.nome || data.email) {
      await tx.usuario.update({ where: { id: usuarioId }, data: { nome: data.nome, email: data.email } });
    }

    if (role === "inquilino" && (data.telefone || data.contatoEmergenciaNome || data.contatoEmergenciaTelefone)) {
      await tx.inquilino.update({
        where: { usuarioId },
        data: {
          telefone: data.telefone,
          contatoEmergenciaNome: data.contatoEmergenciaNome,
          contatoEmergenciaTelefone: data.contatoEmergenciaTelefone,
        },
      });
    }

    const usuario = await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, include: { inquilino: true } });
    return sanitizeUsuario(usuario);
  });
}

async function obterInquilinoOuFalhar(usuarioId: string) {
  const inquilino = await prisma.inquilino.findUnique({ where: { usuarioId } });
  if (!inquilino) throw new AppError("Cadastro de inquilino nao encontrado para este usuario", 404);
  return inquilino;
}

async function obterContratoAtivoOuFalhar(usuarioId: string) {
  const inquilino = await obterInquilinoOuFalhar(usuarioId);
  const contrato = await prisma.contrato.findFirst({
    where: { inquilinoId: inquilino.id, status: "ativo" },
    include: { imovel: { include: { tipoImovel: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!contrato) throw new AppError("Nenhum contrato ativo encontrado", 404);
  return contrato;
}

export async function obterImovel(usuarioId: string) {
  const contrato = await obterContratoAtivoOuFalhar(usuarioId);
  return contrato.imovel;
}

export async function obterContrato(usuarioId: string) {
  return obterContratoAtivoOuFalhar(usuarioId);
}

export async function listarPagamentos(usuarioId: string) {
  const inquilino = await obterInquilinoOuFalhar(usuarioId);
  const hoje = inicioDeHoje();
  // Mesmo corte de inicioDeHoje() e mesma reversao bidirecional de
  // pagamentos.service.ts:atualizarAtrasados - aqui escopado ao inquilino
  // logado, mas as duas rotinas leem/escrevem a mesma tabela Pagamento.
  await Promise.all([
    prisma.pagamento.updateMany({
      where: { contrato: { inquilinoId: inquilino.id }, status: "pendente", dataVencimento: { lt: hoje } },
      data: { status: "atrasado" },
    }),
    prisma.pagamento.updateMany({
      where: { contrato: { inquilinoId: inquilino.id }, status: "atrasado", dataVencimento: { gte: hoje } },
      data: { status: "pendente" },
    }),
  ]);

  return prisma.pagamento.findMany({
    where: { contrato: { inquilinoId: inquilino.id } },
    include: { contrato: { include: { imovel: true } }, recibo: true },
    orderBy: { dataVencimento: "desc" },
  });
}

export async function relatarProblema(usuarioId: string, data: z.infer<typeof relatarProblemaSchema>) {
  const contrato = await obterContratoAtivoOuFalhar(usuarioId);
  return prisma.gastoManutencao.create({
    data: {
      imovelId: contrato.imovelId,
      descricao: data.descricao,
      categoria: data.categoria,
      valor: 0,
      status: "orcamento",
      origem: "chamado_inquilino",
    },
  });
}
