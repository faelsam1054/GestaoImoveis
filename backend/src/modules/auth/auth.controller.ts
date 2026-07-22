import type { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getClientIp } from "../../middlewares/audit.middleware";
import * as authService from "./auth.service";
import { loginSchema, trocarSenhaSchema, esqueciSenhaSchema, redefinirSenhaSchema } from "./auth.schema";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, senha } = loginSchema.parse(req.body);
  const ip = getClientIp(req);

  const { accessToken, refreshToken, usuario } = await authService.login(email, senha, ip);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, usuario });
});

export const refresh = asyncHandler(async (req, res) => {
  const tokenRecebido = req.cookies?.[REFRESH_COOKIE];
  if (!tokenRecebido) throw new AppError("Refresh token ausente", 401);

  const ip = getClientIp(req);
  const { accessToken, refreshToken, usuario } = await authService.refresh(tokenRecebido, ip);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, usuario });
});

export const logout = asyncHandler(async (req, res) => {
  const tokenRecebido = req.cookies?.[REFRESH_COOKIE];
  const ip = getClientIp(req);
  await authService.logout(tokenRecebido, req.user?.id, ip);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user!.id },
    include: { permissaoAdministrador: true },
  });
  if (!usuario) throw new AppError("Usuario nao encontrado", 404);
  const { senhaHash: _senhaHash, ...resto } = usuario;
  res.json(resto);
});

export const trocarSenha = asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body);
  const ip = getClientIp(req);
  await authService.trocarSenha(req.user!.id, senhaAtual, novaSenha, ip);
  res.status(204).send();
});

export const esqueciSenha = asyncHandler(async (req, res) => {
  const { email } = esqueciSenhaSchema.parse(req.body);
  const token = await authService.esqueciSenha(email);

  const resposta: Record<string, unknown> = {
    mensagem: "Se o email existir, um link de redefinicao de senha foi enviado.",
  };
  // Token exposto na resposta apenas fora de producao, so para permitir testar
  // o fluxo sem um servidor de email real.
  if (env.NODE_ENV !== "production" && token) {
    resposta.tokenDev = token;
  }
  res.json(resposta);
});

export const redefinirSenha = asyncHandler(async (req, res) => {
  const { token, novaSenha } = redefinirSenhaSchema.parse(req.body);
  const ip = getClientIp(req);
  await authService.redefinirSenha(token, novaSenha, ip);
  res.status(204).send();
});
