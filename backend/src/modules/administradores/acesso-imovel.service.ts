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

// Variante para rotas que recebem um inquilinoId. Um inquilino pode ter
// contratos em varios imoveis ao longo do tempo - o admin so precisa ter
// vinculo com UM deles (ativo ou historico, ver inquilinos.service.ts:listar).
// Inquilino SEM nenhum contrato ainda (acabou de ser cadastrado, antes do
// primeiro contrato) fica visivel pra qualquer admin com podeVerInquilinos -
// senao o proprio admin que acabou de cadastrar o inquilino nao conseguiria
// achar-lo de novo pra criar o contrato (a restricao so faz sentido depois
// que o inquilino esta de fato vinculado a algum imovel).
export async function verificarAcessoAoInquilino(usuarioId: string, role: Role, inquilinoId: string): Promise<boolean> {
  if (role !== "administrador") return true;

  const totalContratos = await prisma.contrato.count({ where: { inquilinoId } });
  if (totalContratos === 0) return true;

  const idsPermitidos = await obterImovelIdsPermitidos(usuarioId, role);
  if (!idsPermitidos || idsPermitidos.length === 0) return false;

  const contrato = await prisma.contrato.findFirst({
    where: { inquilinoId, imovelId: { in: idsPermitidos } },
    select: { id: true },
  });
  return Boolean(contrato);
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
