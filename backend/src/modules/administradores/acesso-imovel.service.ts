import { prisma } from "../../lib/prisma";
import type { Role } from "../../types/rbac";

// Retorna a lista de imovelId que o usuario pode acessar, ou `null` quando
// nao ha restricao (proprietario sempre enxerga tudo). Usar o retorno assim:
//   where: { id: idsPermitidos ? { in: idsPermitidos } : undefined }
export async function obterImovelIdsPermitidos(usuarioId: string, role: Role): Promise<string[] | null> {
  if (role !== "administrador") return null;

  const vinculos = await prisma.adminImovel.findMany({
    where: { administradorId: usuarioId },
    select: { imovelId: true },
  });
  return vinculos.map((v) => v.imovelId);
}

// Verifica se o usuario pode acessar um imovel especifico (para rotas de
// detalhe/edicao). Proprietario sempre passa.
export async function verificarAcessoAoImovel(usuarioId: string, role: Role, imovelId: string): Promise<boolean> {
  if (role !== "administrador") return true;

  const vinculo = await prisma.adminImovel.findUnique({
    where: { administradorId_imovelId: { administradorId: usuarioId, imovelId } },
  });
  return Boolean(vinculo);
}

// Variante para rotas que recebem um contratoId (ex: lancar pagamento avulso)
// em vez de um imovelId direto.
export async function verificarAcessoAoContrato(usuarioId: string, role: Role, contratoId: string): Promise<boolean> {
  if (role !== "administrador") return true;

  const contrato = await prisma.contrato.findUnique({ where: { id: contratoId }, select: { imovelId: true } });
  if (!contrato) return true; // contrato inexistente: deixa o service seguinte 404ar

  return verificarAcessoAoImovel(usuarioId, role, contrato.imovelId);
}

// Variante para rotas que recebem um pagamentoId (ex: marcar como pago).
export async function verificarAcessoAoPagamento(usuarioId: string, role: Role, pagamentoId: string): Promise<boolean> {
  if (role !== "administrador") return true;

  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    select: { contrato: { select: { imovelId: true } } },
  });
  if (!pagamento) return true; // pagamento inexistente: deixa o service seguinte 404ar

  return verificarAcessoAoImovel(usuarioId, role, pagamento.contrato.imovelId);
}

// Combina um filtro explicito de imovelId (vindo de query string) com a
// restricao de acesso do administrador. Se o admin pedir um imovel fora da
// sua lista, forca resultado vazio em vez de vazar dados de outros imoveis.
export function combinarFiltroImovel(
  imovelIdExplicito: string | undefined,
  idsPermitidos: string[] | null,
): string | { in: string[] } | undefined {
  if (imovelIdExplicito) {
    if (idsPermitidos && !idsPermitidos.includes(imovelIdExplicito)) {
      return { in: [] };
    }
    return imovelIdExplicito;
  }
  return idsPermitidos ? { in: idsPermitidos } : undefined;
}
