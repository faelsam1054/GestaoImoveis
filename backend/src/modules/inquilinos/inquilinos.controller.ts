import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./inquilinos.service";
import {
  criarInquilinoSchema,
  atualizarInquilinoSchema,
  atualizarCpfInquilinoSchema,
  listarInquilinosQuerySchema,
} from "./inquilinos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { AppError } from "../../utils/AppError";
import { obterImovelIdsPermitidos, verificarAcessoAoInquilino } from "../administradores/acesso-imovel.service";
import type { Request } from "express";

async function garantirAcesso(req: Request, inquilinoId: string) {
  const permitido = await verificarAcessoAoInquilino(req.user!.id, req.user!.role, inquilinoId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este inquilino", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarInquilinosQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  const inquilino = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(inquilino);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarInquilinoSchema.parse(req.body);
  const { inquilino, credenciaisTemporarias } = await service.criar(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_INQUILINO",
    entidade: "Inquilino",
    entidadeId: inquilino.id,
    dadosDepois: inquilino,
    ip: getClientIp(req),
  });
  // A senha temporaria so e exposta nesta resposta (nao fica em texto claro no banco).
  res.status(201).json({ inquilino, credenciaisTemporarias });
});

export const atualizar = asyncHandler(async (req, res) => {
  await garantirAcesso(req, paramId(req));
  if (req.body?.cpf !== undefined && req.user!.role !== "proprietario") {
    throw new AppError("Apenas o Proprietário pode alterar o CPF", 403);
  }
  const data = atualizarInquilinoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const inquilino = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_INQUILINO",
    entidade: "Inquilino",
    entidadeId: inquilino.id,
    dadosAntes: antes,
    dadosDepois: inquilino,
    ip: getClientIp(req),
  });
  res.json(inquilino);
});

// Endpoint dedicado para alteracao de CPF (Proprietario apenas - ver rota,
// gated com requireRole). Existe separado do PUT generico para exigir um
// motivo e deixar rastro de auditoria proprio, mais explicito que uma
// atualizacao comum de cadastro.
export const atualizarCpf = asyncHandler(async (req, res) => {
  const { cpf, motivoAlteracao } = atualizarCpfInquilinoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const inquilino = await service.atualizar(paramId(req), { cpf });
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_CPF_INQUILINO",
    entidade: "Inquilino",
    entidadeId: inquilino.id,
    dadosAntes: { cpf: antes.cpf },
    dadosDepois: { cpf: inquilino.cpf, motivoAlteracao },
    ip: getClientIp(req),
  });
  res.json(inquilino);
});

export const desativar = asyncHandler(async (req, res) => {
  await service.desativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESATIVAR_INQUILINO",
    entidade: "Inquilino",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const ativar = asyncHandler(async (req, res) => {
  await service.ativar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ATIVAR_INQUILINO",
    entidade: "Inquilino",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const excluir = asyncHandler(async (req, res) => {
  await service.excluir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "EXCLUIR_INQUILINO",
    entidade: "Inquilino",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const restaurar = asyncHandler(async (req, res) => {
  await service.restaurar(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RESTAURAR_INQUILINO",
    entidade: "Inquilino",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const resetarSenha = asyncHandler(async (req, res) => {
  const credenciaisTemporarias = await service.resetarSenha(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "RESET_SENHA_INQUILINO",
    entidade: "Inquilino",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  // A senha temporaria so e exposta nesta resposta (nao fica em texto claro no banco).
  res.json({ credenciaisTemporarias });
});
