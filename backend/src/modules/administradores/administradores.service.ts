import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { criarUsuarioComSenhaTemporaria, sanitizeUsuario } from "../usuarios/usuarios.service";
import type { criarAdministradorSchema, atualizarAdministradorSchema, atualizarPermissoesSchema } from "./administradores.schema";
import type { z } from "zod";

export async function listar() {
  const administradores = await prisma.usuario.findMany({
    where: { role: "administrador" },
    include: { permissaoAdministrador: true },
    orderBy: { nome: "asc" },
  });
  // Nunca expor pagamentosComoAdmin aqui: o proprio administrador nao pode
  // ver a propria mensalidade, entao essa lista jamais inclui esse dado.
  return administradores.map(sanitizeUsuario);
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
  await prisma.usuario.update({ where: { id }, data: { ativo: false } });
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
