import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import * as service from "./aditivos.service";
import { registrarAuditoria, getClientIp } from "../../middlewares/audit.middleware";
import { caminhoFisico } from "../../middlewares/upload.middleware";
import { verificarAcessoAoImovel } from "../administradores/acesso-imovel.service";

export const download = asyncHandler(async (req, res) => {
  const aditivo = await service.buscarPorIdOuFalhar(paramId(req));
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, aditivo.contrato.imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este aditivo", 403);

  res.download(caminhoFisico(aditivo.arquivoPdfUrl));
});

export const excluir = asyncHandler(async (req, res) => {
  const aditivo = await service.buscarPorIdOuFalhar(paramId(req));
  const permitido = await verificarAcessoAoImovel(req.user!.id, req.user!.role, aditivo.contrato.imovelId);
  if (!permitido) throw new AppError("Voce nao tem acesso a este aditivo", 403);

  await service.excluir(paramId(req));
  await registrarAuditoria({
    usuarioId: req.user!.id,
    acao: "DELETE_ADITIVO_CONTRATO",
    entidade: "AditivoContrato",
    entidadeId: paramId(req),
    dadosAntes: aditivo,
    ip: getClientIp(req),
  });
  res.status(204).send();
});
