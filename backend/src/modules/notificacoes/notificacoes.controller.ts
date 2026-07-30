import { asyncHandler } from "../../utils/asyncHandler";
import { paramId } from "../../utils/params";
import * as service from "./notificacoes.service";

export const listar = asyncHandler(async (req, res) => {
  const notificacoes = await service.listarRecentes(req.user!.id);
  res.json(notificacoes);
});

export const contarNaoLidas = asyncHandler(async (req, res) => {
  const total = await service.contarNaoLidas(req.user!.id);
  res.json({ total });
});

export const marcarComoLida = asyncHandler(async (req, res) => {
  const notificacao = await service.marcarComoLida(paramId(req), req.user!.id);
  res.json(notificacao);
});

export const marcarTodasComoLidas = asyncHandler(async (req, res) => {
  await service.marcarTodasComoLidas(req.user!.id);
  res.status(204).send();
});
