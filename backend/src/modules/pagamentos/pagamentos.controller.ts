import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./pagamentos.service";
import {
  criarPagamentoAvulsoSchema,
  atualizarPagamentoSchema,
  marcarPagoSchema,
  listarPagamentosQuerySchema,
  desfazerPagamentoSchema,
} from "./pagamentos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import {
  obterImovelIdsPermitidos,
  verificarAcessoAoContrato,
  verificarAcessoAoPagamento,
  verificarAcessoAoImovel,
} from "../administradores/acesso-imovel.service";
import { enviarArquivo, baixarArquivo } from "../../lib/storage";
import type { Pagamento } from "@prisma/client";
import type { Request } from "express";

async function garantirAcessoContrato(req: Request, contratoId: string) {
  const permitido = await verificarAcessoAoContrato(req.user!.id, req.user!.role, contratoId);
  if (!permitido) throw new AppError("Voce nao tem acesso ao imovel deste contrato", 403);
}

async function garantirAcessoPagamento(req: Request, pagamentoId: string) {
  const permitido = await verificarAcessoAoPagamento(req.user!.id, req.user!.role, pagamentoId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este pagamento", 403);
}

// Checagem propria pro download do comprovante, que (diferente do resto do
// modulo) tambem precisa liberar o Inquilino vinculado ao contrato -
// verificarAcessoAoPagamento nao serve aqui porque ela nunca foi pensada pra
// ser chamada por um Inquilino (so bloqueia Administrador sem vinculo).
async function garantirAcessoComprovante(
  req: Request,
  pagamento: Pagamento & { contrato: { imovelId: string; inquilino: { usuarioId: string } } },
) {
  if (req.user!.role === "proprietario") return;
  if (req.user!.role === "administrador") {
    const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, pagamento.contrato.imovelId);
    if (permitido) return;
  } else if (req.user!.role === "inquilino") {
    if (pagamento.contrato.inquilino.usuarioId === req.user!.id) return;
  }
  throw new AppError("Voce nao tem acesso a este comprovante", 403);
}

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarPagamentosQuerySchema.parse(req.query);
  const imovelIdsPermitidos = await obterImovelIdsPermitidos(req.user!.id, req.user!.role);
  const resultado = await service.listar({ ...filtros, imovelIdsPermitidos });
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const pagamento = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(pagamento);
});

export const criarAvulso = asyncHandler(async (req, res) => {
  const data = criarPagamentoAvulsoSchema.parse(req.body);
  await garantirAcessoContrato(req, data.contratoId);
  const pagamento = await service.criarAvulso(data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "CREATE_PAGAMENTO_AVULSO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.status(201).json(pagamento);
});

export const atualizar = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const data = atualizarPagamentoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const pagamento = await service.atualizar(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "UPDATE_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosAntes: antes,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const marcarComoPago = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const data = marcarPagoSchema.parse(req.body);
  const pagamento = await service.marcarComoPago(paramId(req), data, req.user!.id);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REGISTRAR_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const desfazerPagamento = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const data = desfazerPagamentoSchema.parse(req.body);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const pagamento = await service.desfazerPagamento(paramId(req), data);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DESFAZER_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosAntes: antes,
    dadosDepois: pagamento,
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const anexarComprovante = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const { url } = await enviarArquivo("pagamentos", req.file.buffer, req.file.originalname, req.file.mimetype);
  const pagamento = await service.anexarComprovante(paramId(req), url, req.file.originalname, req.file.size);
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "ANEXAR_COMPROVANTE_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosAntes: { comprovanteUrl: antes.comprovanteUrl },
    dadosDepois: { comprovanteUrl: url },
    ip: getClientIp(req),
  });
  res.json(pagamento);
});

export const baixarComprovante = asyncHandler(async (req, res) => {
  const pagamento = await service.buscarPorIdOuFalhar(paramId(req));
  await garantirAcessoComprovante(req, pagamento);
  if (!pagamento.comprovanteUrl) throw new AppError("Este pagamento nao possui comprovante anexado", 404);

  const { buffer, contentType } = await baixarArquivo(pagamento.comprovanteUrl);
  const nomeArquivo = pagamento.comprovanteNomeOriginal ?? "comprovante";
  res.setHeader("Content-Type", contentType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.send(buffer);
});

export const removerComprovante = asyncHandler(async (req, res) => {
  await garantirAcessoPagamento(req, paramId(req));
  const antes = await service.buscarPorIdOuFalhar(paramId(req));
  const pagamento = await service.removerComprovante(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "REMOVER_COMPROVANTE_PAGAMENTO",
    entidade: "Pagamento",
    entidadeId: pagamento.id,
    dadosAntes: { comprovanteUrl: antes.comprovanteUrl },
    ip: getClientIp(req),
  });
  res.json(pagamento);
});
