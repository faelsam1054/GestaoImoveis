import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./caucao.service";
import { buscarPorIdOuFalhar } from "./contratos.service";
import { pagarParcelaCaucaoSchema, atualizarParcelasCaucaoSchema } from "./caucao.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcesso(req: Request, contratoId: string) {
  const contrato = await buscarPorIdOuFalhar(contratoId);
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, contrato.imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso ao imovel deste contrato", 403);
}

export const listar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const parcelas = await service.listarParcelas(paramId(req));
  res.json(parcelas);
});

export const pagar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const data = pagarParcelaCaucaoSchema.parse(req.body);
  const parcela = await service.pagarParcela(paramId(req), paramId(req, "parcelaId"), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "PAGAR_PARCELA_CAUCAO",
    entidade: "CaucaoParcela",
    entidadeId: parcela.id,
    dadosDepois: parcela,
    ip: getClientIp(req),
  });
  res.json(parcela);
});

export const atualizar = asyncHandler(async (req, res) => {
  if (req.user!.role !== "proprietario") {
    throw new AppError("Apenas o Proprietário pode alterar valores contratuais", 403);
  }
  await garantirAcesso(req, paramId(req));
  const data = atualizarParcelasCaucaoSchema.parse(req.body);
  const parcelas = await service.atualizarParcelas(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ATUALIZAR_PARCELAS_CAUCAO",
    entidade: "CaucaoParcela",
    entidadeId: paramId(req),
    dadosDepois: parcelas,
    ip: getClientIp(req),
  });
  res.json(parcelas);
});

export const remover = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  await service.removerParcela(paramId(req), paramId(req, "parcelaId"));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REMOVER_PARCELA_CAUCAO",
    entidade: "CaucaoParcela",
    entidadeId: paramId(req, "parcelaId"),
    ip: getClientIp(req),
  });
  res.status(204).send();
});
