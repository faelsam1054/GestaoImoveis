import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./pagamentos.service";
import {
  criarPagamentoAvulsoSchema,
  atualizarPagamentoSchema,
  marcarPagoSchema,
  listarPagamentosQuerySchema,
} from "./pagamentos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarPagamentosQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const pagamento = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(pagamento);
});

export const criarAvulso = asyncHandler(async (req, res) => {
  const data = criarPagamentoAvulsoSchema.parse(req.body);
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
