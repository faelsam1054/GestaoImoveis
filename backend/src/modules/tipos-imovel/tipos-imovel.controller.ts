import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./tipos-imovel.service";
import { criarTipoImovelSchema, atualizarTipoImovelSchema, listarTiposImovelQuerySchema } from "./tipos-imovel.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const query = listarTiposImovelQuerySchema.parse(req.query);
  const ativo = query.ativo === undefined ? undefined : query.ativo === "true";
  const tipos = await service.listar(ativo);
  res.json(tipos);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarTipoImovelSchema.parse(req.body);
  const tipo = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_TIPO_IMOVEL",
    entidade: "TipoImovel",
    entidadeId: tipo.id,
    dadosDepois: tipo,
    ip: getClientIp(req),
  });
  res.status(201).json(tipo);
});

export const atualizar = asyncHandler(async (req, res) => {
  const data = atualizarTipoImovelSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const tipo = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_TIPO_IMOVEL",
    entidade: "TipoImovel",
    entidadeId: tipo.id,
    dadosAntes: antes,
    dadosDepois: tipo,
    ip: getClientIp(req),
  });
  res.json(tipo);
});

export const desativar = asyncHandler(async (req, res) => {
  const tipo = await service.desativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESATIVAR_TIPO_IMOVEL",
    entidade: "TipoImovel",
    entidadeId: tipo.id,
    ip: getClientIp(req),
  });
  res.json(tipo);
});

export const reativar = asyncHandler(async (req, res) => {
  const tipo = await service.reativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REATIVAR_TIPO_IMOVEL",
    entidade: "TipoImovel",
    entidadeId: tipo.id,
    ip: getClientIp(req),
  });
  res.json(tipo);
});
