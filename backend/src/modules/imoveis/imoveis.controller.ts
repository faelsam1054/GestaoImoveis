import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./imoveis.service";
import { criarImovelSchema, atualizarImovelSchema, listarImoveisQuerySchema } from "./imoveis.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { montarUrlArquivo } from "../../middlewares/upload.middleware";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarImoveisQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
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

export const adicionarFoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("Nenhum arquivo enviado", 400);
  const url = montarUrlArquivo("imoveis", req.file.filename);
  const foto = await service.adicionarFoto(paramId(req), url);
  res.status(201).json(foto);
});

export const removerFoto = asyncHandler(async (req, res) => {
  await service.removerFoto(paramId(req), paramId(req, "fotoId"));
  res.status(204).send();
});
