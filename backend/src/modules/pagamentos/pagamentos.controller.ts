import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./pagamentos.service";
import {
  criarPagamentoAvulsoSchema,
  atualizarPagamentoSchema,
  marcarPagoSchema,
  listarPagamentosQuerySchema,
} from "./pagamentos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import {
  obterImovelIdsPermitidos,
  verificarAcessoAoContrato,
  verificarAcessoAoPagamento,
} from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcessoContrato(req: Request, contratoId: string) {
  const permitido = await verificarAcessoAoContrato(req.user!.id, req.user!.role, contratoId);
  if (!permitido) throw new AppError("Voce nao tem acesso ao imovel deste contrato", 403);
}

async function garantirAcessoPagamento(req: Request, pagamentoId: string) {
  const permitido = await verificarAcessoAoPagamento(req.user!.id, req.user!.role, pagamentoId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este pagamento", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarPagamentosQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const pagamento = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(pagamento);
});

export const criarAvulso = asyncHandler(async (req, res) => {
  const data = criarPagamentoAvulsoSchema.parse(req.body);
  await garantirAcessoContrato(req, data.contratoId);
  const pagamento = await service.criarAvulso(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_PAGAMENTO_AVULSO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.status(201).json(pagamento);
});

export const atualizar = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const data = atualizarPagamentoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const pagamento = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosAntes: antes,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const marcarComoPago = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const data = marcarPagoSchema.parse(req.body);
  const pagamento = await service.marcarComoPago(paramId(req), data, req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REGISTRAR_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});
