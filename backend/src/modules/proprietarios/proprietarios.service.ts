import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { criarUsuarioComSenhaTemporaria, sanitizeUsuario } from "../usuarios/usuarios.service";
import { enviarEmail } from "../email/email.service";
import type { criarProprietarioSchema, atualizarProprietarioSchema } from "./proprietarios.schema";
import type { z } from "zod";

export async function listar() {
  const proprietarios = await prisma.usuario.findMany({
    where: { role: "proprietario" },
    orderBy: { nome: "asc" },
  });
  return proprietarios.map(sanitizeUsuario);
}

export async function buscarPorIdOuFalhar(id: string) {
  const proprietario = await prisma.usuario.findUnique({ where: { id } });
  if (!proprietario || proprietario.role !== "proprietario") {
    throw new AppError("Proprietario nao encontrado", 404);
  }
  return proprietario;
}

async function notificarNovoProprietario(email: string, nome: string, senhaTemporaria: string) {
  try {
    await enviarEmail({
      destinatario: email,
      assunto: "[Gestalugua] Acesso criado - Proprietário",
      corpo: [
        `Olá, ${nome}.`,
        "",
        "Uma conta de Proprietário foi criada para você no Gestalugua, com acesso total.",
        `Email: ${email}`,
        `Senha temporária: ${senhaTemporaria}`,
        "",
        "Por segurança, você precisará trocar essa senha no primeiro acesso.",
      ].join("\n"),
    });
  } catch (err) {
    console.error("Falha ao notificar novo proprietario:", err);
  }
}

export async function criar(data: z.infer<typeof criarProprietarioSchema>) {
  const { usuario, senhaTemporaria } = await prisma.$transaction(async (tx) => {
    const resultado = await criarUsuarioComSenhaTemporaria(data.nome, data.email, "proprietario", tx);
    if (data.telefone) {
      await tx.usuario.update({ where: { id: resultado.usuario.id }, data: { telefone: data.telefone } });
    }
    return resultado;
  });

  const proprietario = await buscarPorIdOuFalhar(usuario.id);
  await notificarNovoProprietario(proprietario.email, proprietario.nome, senhaTemporaria);

  return {
    proprietario: sanitizeUsuario(proprietario),
    credenciaisTemporarias: { email: proprietario.email, senhaTemporaria },
  };
}

export async function atualizar(id: string, data: z.infer<typeof atualizarProprietarioSchema>) {
  await buscarPorIdOuFalhar(id);
  const usuario = await prisma.usuario.update({ where: { id }, data });
  return sanitizeUsuario(usuario);
}

async function contarProprietariosAtivos(): Promise<number> {
  return prisma.usuario.count({ where: { role: "proprietario", ativo: true } });
}

async function possuiAcoesRegistradas(usuarioId: string): Promise<boolean> {
  const [logs, contratosCriados, contratosAprovados, recibos] = await Promise.all([
    prisma.logAuditoria.count({ where: { usuarioId } }),
    prisma.contrato.count({ where: { criadoPorId: usuarioId } }),
    prisma.contrato.count({ where: { aprovadoPorId: usuarioId } }),
    prisma.reciboPdf.count({ where: { geradoPorId: usuarioId } }),
  ]);
  return logs + contratosCriados + contratosAprovados + recibos > 0;
}

export async function desativar(id: string, requisitanteId: string) {
  const proprietario = await buscarPorIdOuFalhar(id);
  if (id === requisitanteId) {
    throw new AppError("Você não pode desativar sua própria conta", 400);
  }
  if (proprietario.ativo && (await contarProprietariosAtivos()) <= 1) {
    throw new AppError("Não é possível desativar o último Proprietário ativo", 400);
  }
  await prisma.usuario.update({ where: { id }, data: { ativo: false } });
}

export async function reativar(id: string) {
  await buscarPorIdOuFalhar(id);
  await prisma.usuario.update({ where: { id }, data: { ativo: true } });
}

export async function excluir(id: string, requisitanteId: string) {
  const proprietario = await buscarPorIdOuFalhar(id);
  if (id === requisitanteId) {
    throw new AppError("Você não pode excluir sua própria conta", 400);
  }
  if (proprietario.ativo && (await contarProprietariosAtivos()) <= 1) {
    throw new AppError("Não é possível excluir o último Proprietário ativo", 400);
  }
  if (await possuiAcoesRegistradas(id)) {
    throw new AppError(
      "Este Proprietário possui ações registradas no sistema (contratos, aprovações, auditoria) e não pode ser excluído definitivamente. Desative-o em vez disso.",
      409,
    );
  }
  await prisma.usuario.delete({ where: { id } });
}
