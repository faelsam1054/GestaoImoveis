import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./contratos.service";
import { criarContratoSchema, renovarContratoSchema, listarContratosQuerySchema } from "./contratos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { montarUrlArquivo } from "../../middlewares/upload.middleware";
import { obterImovelIdsPermitidos, verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcesso(req: Request, imovelId: string) {
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso ao imovel deste contrato", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarContratosQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const contrato = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, contrato.imovelId);
  res.json(contrato);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarContratoSchema.parse(req.body);
  await garantirAcesso(req, data.imovelId);
  const contrato = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    dadosDepois: contrato,
    ip: getClientIp(req),
  });
  res.status(201).json(contrato);
});

export const encerrar = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  const contrato = await service.encerrar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ENCERRAR_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const rescindir = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  const contrato = await service.rescindir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RESCINDIR_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const renovar = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  const data = renovarContratoSchema.parse(req.body);
  const novoContrato = await service.renovar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RENOVAR_CONTRATO",
    entidade: "Contrato",
    entidadeId: novoContrato.id,
    dadosAntes: { contratoAnteriorId: paramId(req) },
    dadosDepois: novoContrato,
    ip: getClientIp(req),
  });
  res.status(201).json(novoContrato);
});

export const anexarContratoAssinado = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const url = montarUrlArquivo("contratos", req.file.filename);
  const contrato = await service.anexarContratoAssinado(paramId(req), url);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ANEXAR_CONTRATO_ASSINADO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    dadosDepois: { contratoAssinadoUrl: url },
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const removerContratoAssinado = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  const contrato = await service.removerContratoAssinado(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REMOVER_CONTRATO_ASSINADO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    ip: getClientIp(req),
  });
  res.json(contrato);
});
