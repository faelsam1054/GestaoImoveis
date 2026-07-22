import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./auditoria.service";
import { listarAuditoriaQuerySchema } from "./auditoria.schema";

export const listar = asyncHandler(async (req, res) => {
  const filtros = listarAuditoriaQuerySchema.parse(req.query);
  const resultado = await service.listar(filtros);
  res.json(resultado);
});
