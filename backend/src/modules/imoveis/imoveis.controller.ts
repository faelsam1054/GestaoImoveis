import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./imoveis.service";
import { criarImovelSchema, atualizarImovelSchema, listarImoveisQuerySchema } from "./imoveis.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { enviarArquivo } from "../../lib/storage";
import { obterImovelIdsPermitidos, verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcesso(req: Request, imovelId: string) {
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este imovel", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarImoveisQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const imovel = await service.detalhar(paramId(req));
  res.json(imovel);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarImovelSchema.parse(req.body);
  const imovel = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_IMOVEL",
    entidade: "Imovel",
    entidadeId: imovel.id,
    dadosDepois: imovel,
    ip: getClientIp(req),
  });
  res.status(201).json(imovel);
});

export const atualizar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const data = atualizarImovelSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const imovel = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_IMOVEL",
    entidade: "Imovel",
    entidadeId: imovel.id,
    dadosAntes: antes,
    dadosDepois: imovel,
    ip: getClientIp(req),
  });
  res.json(imovel);
});

export const remover = asyncHandler(async (req, res) => {
  await service.remover(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_IMOVEL",
    entidade: "Imovel",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const restaurar = asyncHandler(async (req, res) => {
  await service.restaurar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RESTORE_IMOVEL",
    entidade: "Imovel",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const ativar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const imovel = await service.ativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ATIVAR_IMOVEL",
    entidade: "Imovel",
    entidadeId: imovel.id,
    dadosDepois: imovel,
    ip: getClientIp(req),
  });
  res.json(imovel);
});

export const desativar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const imovel = await service.desativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESATIVAR_IMOVEL",
    entidade: "Imovel",
    entidadeId: imovel.id,
    dadosDepois: imovel,
    ip: getClientIp(req),
  });
  res.json(imovel);
});

export const adicionarFoto = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const { url } = await enviarArquivo("imoveis", req.file.buffer, req.file.originalname, req.file.mimetype);
  const foto = await service.adicionarFoto(paramId(req), url);
  res.status(201).json(foto);
});

export const removerFoto = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  await service.removerFoto(paramId(req), paramId(req, "fotoId"));
  res.status(204).send();
});
