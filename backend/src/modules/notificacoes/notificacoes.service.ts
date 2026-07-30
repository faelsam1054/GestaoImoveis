import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// Helper generico e reutilizavel: qualquer fluxo do sistema pode chamar isso
// para notificar um usuario, bastando definir um novo "tipo". Best-effort -
// quem chama deve envolver em try/catch se a notificacao nao puder bloquear
// a operacao principal (ver uso em contratos.service.ts).
export async function criarNotificacao(dados: {
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
}) {
  return prisma.notificacao.create({ data: dados });
}

export async function listarRecentes(usuarioId: string) {
  return prisma.notificacao.findMany({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function contarNaoLidas(usuarioId: string) {
  return prisma.notificacao.count({ where: { usuarioId, lida: false } });
}

export async function marcarComoLida(id: string, usuarioId: string) {
  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao || notificacao.usuarioId !== usuarioId) {
    throw new AppError("Notificacao nao encontrada", 404);
  }
  return prisma.notificacao.update({
    where: { id },
    data: { lida: true, lidaEm: new Date() },
  });
}

export async function marcarTodasComoLidas(usuarioId: string) {
  await prisma.notificacao.updateMany({
    where: { usuarioId, lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
}
