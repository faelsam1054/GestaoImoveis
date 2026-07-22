import { prisma } from "../../lib/prisma";
import { hashPassword, gerarSenhaTemporaria } from "../../utils/password";
import { AppError } from "../../utils/AppError";
import type { Role } from "../../types/rbac";
import type { Prisma, PrismaClient, Usuario } from "@prisma/client";

type Cliente = PrismaClient | Prisma.TransactionClient;

// Usado pelos modulos de Inquilinos e Administradores: cria o Usuario de
// acesso com uma senha temporaria que precisa ser trocada no primeiro login.
// Aceita um client opcional para poder ser chamado dentro de uma $transaction.
export async function criarUsuarioComSenhaTemporaria(
  nome: string,
  email: string,
  role: Role,
  client: Cliente = prisma,
) {
  const senhaTemporaria = gerarSenhaTemporaria();
  const senhaHash = await hashPassword(senhaTemporaria);

  const usuario = await client.usuario.create({
    data: { nome, email, senhaHash, role, precisaTrocarSenha: true },
  });

  return { usuario, senhaTemporaria };
}

export function sanitizeUsuario<T extends { senhaHash: string }>(usuario: T): Omit<T, "senhaHash"> {
  const { senhaHash: _senhaHash, ...resto } = usuario;
  return resto;
}

// Usado pelo proprietario para resetar a senha de um Inquilino/Administrador:
// gera uma nova senha temporaria (mesmo fluxo do cadastro inicial) e revoga
// as sessoes ativas, forçando um novo login com a senha trocada.
export async function resetarSenhaUsuario(usuarioId: string, client: Cliente = prisma) {
  const senhaTemporaria = gerarSenhaTemporaria();
  const senhaHash = await hashPassword(senhaTemporaria);

  await client.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash, precisaTrocarSenha: true },
  });

  await client.refreshToken.updateMany({
    where: { usuarioId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { senhaTemporaria };
}

export async function buscarUsuarioAtivoOuFalhar(id: string): Promise<Usuario> {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw new AppError("Usuario nao encontrado", 404);
  }
  return usuario;
}
