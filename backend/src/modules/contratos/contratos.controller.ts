import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./contratos.service";
import { criarContratoSchema, renovarContratoSchema, listarContratosQuerySchema } from "./contratos.schema";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarContratosQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});

export const detalhar = asyncHandler(async (req, res) => {
  const contrato = await service.buscarPorIdOuFalhar(paramId(req));
  res.json(contrato);
});

export const criar = asyncHandler(async (req, res) => {
  const data = criarContratoSchema.parse(req.body);
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
