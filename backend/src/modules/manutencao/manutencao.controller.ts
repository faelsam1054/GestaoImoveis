import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./manutencao.service";
import {
  criarGastoManutencaoSchema,
  atualizarGastoManutencaoSchema,
  atualizarStatusManutencaoSchema,
  listarManutencaoQuerySchema,
} from "./manutencao.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { montarUrlArquivo } from "../../middlewares/upload.middleware";
import { obterImovelIdsPermitidos, verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcesso(req: Request, imovelId: string) {
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este imovel", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarManutencaoQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const gasto = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, gasto.imovelId);
  res.json(gasto);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarGastoManutencaoSchema.parse(req.body);
  await garantirAcesso(req, data.imovelId);
  const gasto = await service.criar(data, "proprietario");
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_GASTO_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    dadosDepois: gasto,
    ip: getClientIp(req),
  });
  res.status(201).json(gasto);
});

export const atualizar = asyncHandler(async (req, res) => {
  const data = atualizarGastoManutencaoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const gasto = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_GASTO_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    dadosAntes: antes,
    dadosDepois: gasto,
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const atualizarStatus = asyncHandler(async (req, res) => {
  const data = atualizarStatusManutencaoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const gasto = await service.atualizarStatus(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_STATUS_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    dadosAntes: { status: antes.status },
    dadosDepois: { status: gasto.status },
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const anexarComprovante = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const url = montarUrlArquivo("manutencao", req.file.filename);
  const gasto = await service.anexarComprovante(paramId(req), url);
  res.json(gasto);
});
