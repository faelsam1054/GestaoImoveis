import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./inquilinos.service";
import { criarInquilinoSchema, atualizarInquilinoSchema, listarInquilinosQuerySchema } from "./inquilinos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarInquilinosQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
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
