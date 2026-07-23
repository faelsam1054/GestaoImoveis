import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./proprietarios.service";
import { criarProprietarioSchema, atualizarProprietarioSchema } from "./proprietarios.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const proprietarios = await service.listar();
  res.json(proprietarios);
});

export const detalhar = asyncHandler(async (req, res) => {
  const proprietario = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(proprietario);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarProprietarioSchema.parse(req.body);
  const { proprietario, credenciaisTemporarias } = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_PROPRIETARIO",
    entidade: "Usuario",
    entidadeId: proprietario.id,
    dadosDepois: proprietario,
    ip: getClientIp(req),
  });
  res.status(201).json({ proprietario, credenciaisTemporarias });
});

export const atualizar = asyncHandler(async (req, res) => {
  const data = atualizarProprietarioSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const proprietario = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PROPRIETARIO",
    entidade: "Usuario",
    entidadeId: proprietario.id,
    dadosAntes: antes,
    dadosDepois: proprietario,
    ip: getClientIp(req),
  });
  res.json(proprietario);
});

export const desativar = asyncHandler(async (req, res) => {
  await service.desativar(paramId(req), req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESATIVAR_PROPRIETARIO",
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
    acao: "REATIVAR_PROPRIETARIO",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const excluir = asyncHandler(async (req, res) => {
  await service.excluir(paramId(req), req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_PROPRIETARIO",
    entidade: "Usuario",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});
