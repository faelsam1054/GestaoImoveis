import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./administradores.service";
import { criarAdministradorSchema, atualizarAdministradorSchema, atualizarPermissoesSchema } from "./administradores.schema";
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
