import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./pagamentos-admin.service";
import {
  marcarPagoAdminSchema,
  listarPagamentosAdminQuerySchema,
  calcularPagamentoAdminParamsSchema,
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

export const calcular = asyncHandler(async (req, res) => {
  const { administradorId, mesReferencia } = calcularPagamentoAdminParamsSchema.parse(req.params);
  const resultado = await service.calcular(administradorId, mesReferencia);
  if (resultado.existente && resultado.criadoAgora) {
    await registrarAuditoria({
      usuarioId: req.user!.id,
      acao: "CALCULAR_PAGAMENTO_ADMIN",
      entidade: "PagamentoAdministrador",
      entidadeId: resultado.registro.id,
      dadosDepois: resultado.registro,
      ip: getClientIp(req),
    });
  }
  res.json(resultado);
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

export const desfazerPagamento = asyncHandler(async (req, res) => {
  const pagamento = await service.desfazerPagamento(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESFAZER_PAGAMENTO_ADMIN",
    entidade: "PagamentoAdministrador",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});
