import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./me.service";
import { atualizarPerfilSchema, relatarProblemaSchema } from "./me.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const obterPerfil = asyncHandler(async (req, res) => {
  const perfil = await service.obterPerfil(req.user!.id);
  res.json(perfil);
});

export const atualizarPerfil = asyncHandler(async (req, res) => {
  const data = atualizarPerfilSchema.parse(req.body);
  const perfil = await service.atualizarPerfil(req.user!.id, req.user!.role, data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PERFIL",
    entidade: "Usuario",
    entidadeId: req.user!.id,
    dadosDepois: perfil,
    ip: getClientIp(req),
  });
  res.json(perfil);
});

export const obterImovel = asyncHandler(async (req, res) => {
  const imovel = await service.obterImovel(req.user!.id);
  res.json(imovel);
});

export const obterContrato = asyncHandler(async (req, res) => {
  const contrato = await service.obterContrato(req.user!.id);
  res.json(contrato);
});

export const listarPagamentos = asyncHandler(async (req, res) => {
  const pagamentos = await service.listarPagamentos(req.user!.id);
  res.json(pagamentos);
});

export const relatarProblema = asyncHandler(async (req, res) => {
  const data = relatarProblemaSchema.parse(req.body);
  const chamado = await service.relatarProblema(req.user!.id, data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RELATAR_PROBLEMA",
    entidade: "GastoManutencao",
    entidadeId: chamado.id,
    dadosDepois: chamado,
    ip: getClientIp(req),
  });
  res.status(201).json(chamado);
});
