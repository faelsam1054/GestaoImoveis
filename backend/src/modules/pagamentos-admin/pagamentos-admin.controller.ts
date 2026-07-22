import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./pagamentos-admin.service";
import {
  criarPagamentoAdminSchema,
  atualizarPagamentoAdminSchema,
  marcarPagoAdminSchema,
  listarPagamentosAdminQuerySchema,
} from "./pagamentos-admin.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarPagamentosAdminQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const pagamento = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(pagamento);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarPagamentoAdminSchema.parse(req.body);
  const pagamento = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_PAGAMENTO_ADMIN",
    entidade: "PagamentoAdministrador",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.status(201).json(pagamento);
});

export const atualizar = asyncHandler(async (req, res) => {
  const data = atualizarPagamentoAdminSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const pagamento = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PAGAMENTO_ADMIN",
    entidade: "PagamentoAdministrador",
    entidadeId: pagamento.id,
    dadosAntes: antes,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const marcarComoPago = asyncHandler(async (req, res) => {
  const data = marcarPagoAdminSchema.parse(req.body);
  const pagamento = await service.marcarComoPago(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REGISTRAR_PAGAMENTO_ADMIN",
    entidade: "PagamentoAdministrador",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});
