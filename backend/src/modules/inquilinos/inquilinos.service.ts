import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { criarUsuarioComSenhaTemporaria } from "../usuarios/usuarios.service";
import type { criarInquilinoSchema, atualizarInquilinoSchema } from "./inquilinos.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosInquilino {
  busca?: string;
  page?: string;
  pageSize?: string;
}

const includeUsuario = {
  usuario: { select: { id: true, nome: true, email: true, ativo: true, precisaTrocarSenha: true } },
} satisfies Prisma.InquilinoInclude;

export async function listar(filtros: FiltrosInquilino) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.InquilinoWhereInput = filtros.busca
    ? {
        OR: [
          { cpf: { contains: filtros.busca } },
          { usuario: { nome: { contains: filtros.busca } } },
          { usuario: { email: { contains: filtros.busca } } },
        ],
      }
    : {};

  const [dados, total] = await Promise.all([
    prisma.inquilino.findMany({
      where,
      include: includeUsuario,
      orderBy: { createdAt: "desc" },
      skip: paginacao.skip,
      take: paginacao.take,
    }),
    prisma.inquilino.count({ where }),
  ]);

  return paginar(dados, total, paginacao);
}

export async function buscarPorIdOuFalhar(id: string) {
  const inquilino = await prisma.inquilino.findUnique({
    where: { id },
    include: {
      ...includeUsuario,
      contratos: {
        orderBy: { createdAt: "desc" },
        include: { imovel: true },
      },
    },
  });
  if (!inquilino) throw new AppError("Inquilino nao encontrado", 404);
  return inquilino;
}

export async function criar(data: z.infer<typeof criarInquilinoSchema>) {
  const cpfExistente = await prisma.inquilino.findUnique({ where: { cpf: data.cpf } });
  if (cpfExistente) throw new AppError("Ja existe um inquilino cadastrado com este CPF", 409);

  return prisma.$transaction(async (tx) => {
    const { usuario, senhaTemporaria } = await criarUsuarioComSenhaTemporaria(
      data.nome,
      data.email,
      "inquilino",
      tx,
    );

    const inquilino = await tx.inquilino.create({
      data: {
        usuarioId: usuario.id,
        cpf: data.cpf,
        telefone: data.telefone,
        contatoEmergenciaNome: data.contatoEmergenciaNome,
        contatoEmergenciaTelefone: data.contatoEmergenciaTelefone,
      },
      include: includeUsuario,
    });

    return { inquilino, credenciaisTemporarias: { email: usuario.email, senhaTemporaria } };
  });
}

export async function atualizar(id: string, data: z.infer<typeof atualizarInquilinoSchema>) {
  const inquilino = await buscarPorIdOuFalhar(id);

  return prisma.$transaction(async (tx) => {
    if (data.nome || data.email) {
      await tx.usuario.update({
        where: { id: inquilino.usuarioId },
        data: { nome: data.nome, email: data.email },
      });
    }
    return tx.inquilino.update({
      where: { id },
      data: {
        telefone: data.telefone,
        contatoEmergenciaNome: data.contatoEmergenciaNome,
        contatoEmergenciaTelefone: data.contatoEmergenciaTelefone,
      },
      include: includeUsuario,
    });
  });
}

// "Remover" um inquilino desativa o login dele, preservando historico de
// contratos/pagamentos (exclusao definitiva quebraria a integridade financeira).
export async function desativar(id: string) {
  const inquilino = await buscarPorIdOuFalhar(id);
  await prisma.usuario.update({ where: { id: inquilino.usuarioId }, data: { ativo: false } });
}
