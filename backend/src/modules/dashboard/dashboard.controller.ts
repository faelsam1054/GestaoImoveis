import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./dashboard.service";

export const resumo = asyncHandler(async (_req, res) => {
  const dados = await service.resumo();
  res.json(dados);
});

export const graficoReceitasDespesas = asyncHandler(async (_req, res) => {
  const dados = await service.graficoReceitasDespesas();
  res.json(dados);
});
