import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { parsePaginacao, paginar } from "../../utils/pagination";
import { criarUsuarioComSenhaTemporaria, resetarSenhaUsuario } from "../usuarios/usuarios.service";
import type { criarInquilinoSchema, atualizarInquilinoSchema } from "./inquilinos.schema";
import type { z } from "zod";
import type { Prisma } from "@prisma/client";

interface FiltrosInquilino {
  busca?: string;
  page?: string;
  pageSize?: string;
  apenasExcluidos?: boolean;
  imovelIdsPermitidos?: string[] | null;
}

const includeUsuario = {
  usuario: { select: { id: true, nome: true, email: true, ativo: true, precisaTrocarSenha: true } },
} satisfies Prisma.InquilinoInclude;

export async function listar(filtros: FiltrosInquilino) {
  const paginacao = parsePaginacao(filtros);

  const where: Prisma.InquilinoWhereInput = {
    excluidoEm: filtros.apenasExcluidos ? { not: null } : null,
    // AND (nao spread direto) porque tanto a busca quanto a restricao de
    // imovel usam sua propria clausula OR - misturar as duas no mesmo nivel
    // faria a segunda sobrescrever a primeira num objeto JS comum.
    AND: [
      filtros.busca
        ? {
            OR: [
              { cpf: { contains: filtros.busca } },
              { usuario: { nome: { contains: filtros.busca } } },
              { usuario: { email: { contains: filtros.busca } } },
            ],
          }
        : {},
      // Administrador so ve inquilinos com pelo menos um contrato (ativo ou
      // historico) em algum imovel vinculado a ele. Inquilino ainda sem
      // nenhum contrato (recem cadastrado) fica visivel pra qualquer admin -
      // a restricao so faz sentido depois que ele esta de fato vinculado a
      // um imovel especifico (ver mesmo raciocinio em verificarAcessoAoInquilino).
      filtros.imovelIdsPermitidos
        ? {
            OR: [
              { contratos: { none: {} } },
              { contratos: { some: { imovelId: { in: filtros.imovelIdsPermitidos } } } },
            ],
          }
        : {},
    ],
  };

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
        cpf: data.cpf,
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

export async function ativar(id: string) {
  const inquilino = await buscarPorIdOuFalhar(id);
  if (inquilino.excluidoEm) throw new AppError("Nao e possivel ativar um inquilino excluido", 409);
  await prisma.usuario.update({ where: { id: inquilino.usuarioId }, data: { ativo: true } });
}

export async function excluir(id: string) {
  const inquilino = await buscarPorIdOuFalhar(id);
  if (inquilino.excluidoEm) throw new AppError("Este inquilino ja esta excluido", 409);
  const temContratoAtivo = inquilino.contratos.some((c) => c.status === "ativo");
  if (temContratoAtivo) {
    throw new AppError("Nao e possivel excluir um inquilino com contrato ativo. Encerre o contrato primeiro.", 409);
  }
  await prisma.$transaction([
    prisma.inquilino.update({ where: { id }, data: { excluidoEm: new Date() } }),
    prisma.usuario.update({ where: { id: inquilino.usuarioId }, data: { ativo: false } }),
  ]);
}

export async function restaurar(id: string) {
  const inquilino = await buscarPorIdOuFalhar(id);
  if (!inquilino.excluidoEm) throw new AppError("Este inquilino nao esta excluido", 409);
  await prisma.inquilino.update({ where: { id }, data: { excluidoEm: null } });
}

export async function resetarSenha(id: string) {
  const inquilino = await buscarPorIdOuFalhar(id);
  const { senhaTemporaria } = await resetarSenhaUsuario(inquilino.usuarioId);
  return { email: inquilino.usuario.email, senhaTemporaria };
}
