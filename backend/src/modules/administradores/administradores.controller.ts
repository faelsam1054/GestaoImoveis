import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./administradores.service";
import {
  criarAdministradorSchema,
  atualizarAdministradorSchema,
  atualizarPermissoesSchema,
  vincularImovelSchema,
  substituirImoveisVinculadosSchema,
} from "./administradores.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const administradores = await service.listar();
  res.json(administradores);
});

export const detalhar = asyncHandler(async (req, res) => {
  const administrador = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(administrador);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarAdministradorSchema.parse(req.body);
  const { administrador, credenciaisTemporarias } = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: administrador.id,
    dadosDepois: administrador,
    ip: getClientIp(req),
  });
  res.status(201).json({ administrador, credenciaisTemporarias });
});

export const atualizar = asyncHandler(async (req, res) => {
  const data = atualizarAdministradorSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const administrador = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: administrador.id,
    dadosAntes: antes,
    dadosDepois: administrador,
    ip: getClientIp(req),
  });
  res.json(administrador);
});

export const desativar = asyncHandler(async (req, res) => {
  await service.desativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESATIVAR_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const reativar = asyncHandler(async (req, res) => {
  await service.reativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REATIVAR_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const excluir = asyncHandler(async (req, res) => {
  await service.excluir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const resetarSenha = asyncHandler(async (req, res) => {
  const credenciaisTemporarias = await service.resetarSenha(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RESET_SENHA_ADMINISTRADOR",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.json({ credenciaisTemporarias });
});

export const obterPermissoes = asyncHandler(async (req, res) => {
  const permissoes = await service.obterPermissoes(paramId(req));
  res.json(permissoes);
});

export const atualizarPermissoes = asyncHandler(async (req, res) => {
  const data = atualizarPermissoesSchema.parse(req.body);
  const antes = await service.obterPermissoes(paramId(req));
  const permissoes = await service.atualizarPermissoes(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PERMISSOES_ADMINISTRADOR",
    entidade: "PermissaoAdministrador",
    entidadeId: paramId(req),
    dadosAntes: antes,
    dadosDepois: permissoes,
    ip: getClientIp(req),
  });
  res.json(permissoes);
});

// ── Vinculo de imoveis ────────────────────────────────────────────────────

export const listarImoveisVinculados = asyncHandler(async (req, res) => {
  const imoveis = await service.listarImoveisVinculados(paramId(req));
  res.json(imoveis);
});

export const vincularImovel = asyncHandler(async (req, res) => {
  const { imovelId } = vincularImovelSchema.parse(req.body);
  const vinculo = await service.vincularImovel(paramId(req), imovelId);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "VINCULAR_IMOVEL_ADMINISTRADOR",
    entidade: "AdminImovel",
    entidadeId: paramId(req),
    dadosDepois: { imovelId },
    ip: getClientIp(req),
  });
  res.status(201).json(vinculo);
});

export const desvincularImovel = asyncHandler(async (req, res) => {
  await service.desvincularImovel(paramId(req), paramId(req, "imovelId"));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESVINCULAR_IMOVEL_ADMINISTRADOR",
    entidade: "AdminImovel",
    entidadeId: paramId(req),
    dadosDepois: { imovelId: paramId(req, "imovelId") },
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const substituirImoveisVinculados = asyncHandler(async (req, res) => {
  const { imovelIds } = substituirImoveisVinculadosSchema.parse(req.body);
  const imoveis = await service.substituirImoveisVinculados(paramId(req), imovelIds);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "SUBSTITUIR_IMOVEIS_VINCULADOS",
    entidade: "AdminImovel",
    entidadeId: paramId(req),
    dadosDepois: { imovelIds },
    ip: getClientIp(req),
  });
  res.json(imoveis);
});
