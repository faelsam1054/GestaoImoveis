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
import { enviarArquivo, baixarArquivo } from "../../lib/storage";
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
  if (data.imovelId && data.imovelId !== antes.imovelId) {
    await garantirAcesso(req, data.imovelId);
  }
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
  const { url } = await enviarArquivo("manutencao", req.file.buffer, req.file.originalname, req.file.mimetype);
  const gasto = await service.anexarComprovante(paramId(req), url, req.file.originalname, req.file.size);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ANEXAR_COMPROVANTE_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    dadosAntes: { comprovantePdfUrl: antes.comprovantePdfUrl },
    dadosDepois: { comprovantePdfUrl: url },
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const baixarComprovante = asyncHandler(async (req, res) => {
  const gasto = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, gasto.imovelId);
  if (!gasto.comprovantePdfUrl) throw new AppError("Este gasto de manutencao nao possui comprovante anexado", 404);

  const { buffer, contentType } = await baixarArquivo(gasto.comprovantePdfUrl);
  const nomeArquivo = gasto.comprovanteNomeOriginal ?? "comprovante.pdf";
  res.setHeader("Content-Type", contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.send(buffer);
});

export const removerComprovante = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const gasto = await service.removerComprovante(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REMOVER_COMPROVANTE_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const excluir = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  await service.excluir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_GASTO_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: paramId(req),
    dadosAntes: antes,
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const pausarRecorrencia = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const gasto = await service.pausarRecorrencia(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "PAUSAR_RECORRENCIA_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const retomarRecorrencia = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const gasto = await service.retomarRecorrencia(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RETOMAR_RECORRENCIA_MANUTENCAO",
    entidade: "GastoManutencao",
    entidadeId: gasto.id,
    ip: getClientIp(req),
  });
  res.json(gasto);
});

export const listarRecorrencias = asyncHandler(async (req, res) => {
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, antes.imovelId);
  const instancias = await service.listarRecorrencias(paramId(req));
  res.json(instancias);
});
