import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./contratos.service";
import {
  criarContratoSchema,
  renovarContratoSchema,
  listarContratosQuerySchema,
  rejeitarContratoSchema,
  atualizarValoresContratoSchema,
  atualizarPagamentosLoteSchema,
} from "./contratos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { enviarArquivo, baixarArquivo } from "../../lib/storage";
import { obterImovelIdsPermitidos, verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";
import * as aditivosService from "../aditivos/aditivos.service";
import { criarAditivoSchema } from "../aditivos/aditivos.schema";
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

// Preview/download do PDF gerado automaticamente do contrato (arquivoPdfUrl)
// - usado na tela de Contratos Pendentes, pro Proprietario avaliar o
// documento antes de aprovar/rejeitar. Permissao mais restrita que o resto
// do modulo: so o Proprietario e o Administrador que cadastrou o contrato
// (nao qualquer admin vinculado ao imovel).
export const baixarArquivoContrato = asyncHandler(async (req, res) => {
  const contrato = await service.buscarPorIdOuFalhar(paramId(req));
  const podeAcessar = req.user!.role === "proprietario" || contrato.criadoPorId === req.user!.id;
  if (!podeAcessar) throw new AppError("Voce nao tem acesso a este documento", 403);
  if (!contrato.arquivoPdfUrl) throw new AppError("Este contrato nao possui PDF gerado", 404);

  const { buffer, contentType } = await baixarArquivo(contrato.arquivoPdfUrl);
  res.setHeader("Content-Type", contentType ?? "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="contrato.pdf"');
  res.send(buffer);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarContratoSchema.parse(req.body);
  await garantirAcesso(req, data.imovelId);
  const contrato = await service.criar(data, { id: req.user!.id, role: req.user!.role });
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

export const listarPendentesAprovacao = asyncHandler(async (req, res) => {
  const contratos = await service.listarPendentesAprovacao();
  res.json(contratos);
});

export const aprovar = asyncHandler(async (req, res) => {
  const contrato = await service.aprovar(paramId(req), req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "APROVAR_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const rejeitar = asyncHandler(async (req, res) => {
  const { motivoRejeicao } = rejeitarContratoSchema.parse(req.body);
  const contrato = await service.rejeitar(paramId(req), motivoRejeicao);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REJEITAR_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    dadosDepois: { motivoRejeicao },
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const encerrar = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);

  // Anexo opcional de PDF de quebra de contrato - so faz sentido no momento
  // do encerramento em si (nao ha rota separada pra anexar isso depois).
  let quebraContratoUrl: string | undefined;
  if (req.file) {
    const { url } = await enviarArquivo("contratos", req.file.buffer, req.file.originalname, req.file.mimetype);
    quebraContratoUrl = url;
  }

  const contrato = await service.encerrar(paramId(req), quebraContratoUrl);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ENCERRAR_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    dadosDepois: quebraContratoUrl ? { quebraContratoUrl } : undefined,
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const renovar = asyncHandler(async (req, res) => {
  if (req.user!.role !== "proprietario") {
    throw new AppError("Apenas o Proprietário pode alterar valores contratuais", 403);
  }
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

export const atualizarValores = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  const data = atualizarValoresContratoSchema.parse(req.body);
  const contrato = await service.atualizarValores(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ATUALIZAR_VALORES_CONTRATO",
    entidade: "Contrato",
    entidadeId: contrato.id,
    dadosAntes: { valorAluguel: existente.valorAluguel, diaVencimento: existente.diaVencimento },
    dadosDepois: {
      valorAluguel: contrato.valorAluguel,
      diaVencimento: contrato.diaVencimento,
      atualizarPagamentosFuturos: data.atualizarPagamentosFuturos,
    },
    ip: getClientIp(req),
  });
  res.json(contrato);
});

export const atualizarPagamentosLote = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  const { mesInicio } = atualizarPagamentosLoteSchema.parse(req.body);
  const resultado = await service.atualizarPagamentosEmLote(paramId(req), { mesInicio });
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ATUALIZAR_PAGAMENTOS_LOTE_CONTRATO",
    entidade: "Contrato",
    entidadeId: existente.id,
    dadosDepois: { mesInicio, ...resultado },
    ip: getClientIp(req),
  });
  res.json(resultado);
});

export const anexarContratoAssinado = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const { url } = await enviarArquivo("contratos", req.file.buffer, req.file.originalname, req.file.mimetype);
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

export const excluir = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  await service.excluir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_CONTRATO",
    entidade: "Contrato",
    entidadeId: paramId(req),
    ip: getClientIp(req),
  });
  res.status(204).send();
});

export const criarAditivo = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const data = criarAditivoSchema.parse(req.body);
  const { url } = await enviarArquivo("aditivos", req.file.buffer, req.file.originalname, req.file.mimetype);
  const aditivo = await aditivosService.criar(paramId(req), data, url, req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_ADITIVO_CONTRATO",
    entidade: "AditivoContrato",
    entidadeId: aditivo.id,
    dadosDepois: aditivo,
    ip: getClientIp(req),
  });
  res.status(201).json(aditivo);
});

export const listarAditivos = asyncHandler(async (req, res) => {
  const existente = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcesso(req, existente.imovelId);
  const aditivos = await aditivosService.listarPorContrato(paramId(req));
  res.json(aditivos);
});
