import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { comparePassword, hashPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import { registrarAuditoria } from "../../middlewares/audit.middleware";
import { env } from "../../config/env";
import type { Usuario } from "@prisma/client";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeUsuario<T extends Usuario>(usuario: T) {
  const { senhaHash: _senhaHash, ...resto } = usuario;
  return resto;
}

// Login/me/refresh sempre trazem a propria permissao granular junto (quando
// administrador): o frontend usa isso para montar o menu e decidir a tela
// inicial, ja que o administrador nao tem acesso a rota /administradores/:id/permissoes.
const includePermissao = { permissaoAdministrador: true } as const;

async function emitirTokens(usuarioId: string, role: string, email: string) {
  const accessToken = signAccessToken({ sub: usuarioId, role: role as never, email });
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: usuarioId, jti });

  const decoded = jwt.decode(refreshToken) as { exp: number };
  await prisma.refreshToken.create({
    data: {
      usuarioId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function login(email: string, senha: string, ip: string | null) {
  const usuario = await prisma.usuario.findUnique({ where: { email }, include: includePermissao });

  if (!usuario || !usuario.ativo) {
    await registrarAuditoria({ acao: "LOGIN_FALHOU", entidade: "Usuario", dadosDepois: { email }, ip });
    throw new AppError("Credenciais invalidas", 401);
  }

  const senhaOk = await comparePassword(senha, usuario.senhaHash);
  if (!senhaOk) {
    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: "LOGIN_FALHOU",
      entidade: "Usuario",
      entidadeId: usuario.id,
      ip,
    });
    throw new AppError("Credenciais invalidas", 401);
  }

  const { accessToken, refreshToken } = await emitirTokens(usuario.id, usuario.role, usuario.email);

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "LOGIN",
    entidade: "Usuario",
    entidadeId: usuario.id,
    ip,
  });

  return { accessToken, refreshToken, usuario: sanitizeUsuario(usuario) };
}

export async function refresh(tokenRecebido: string, ip: string | null) {
  let payload;
  try {
    payload = verifyRefreshToken(tokenRecebido);
  } catch {
    throw new AppError("Refresh token invalido ou expirado", 401);
  }

  const tokenHash = hashToken(tokenRecebido);
  const registro = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!registro || registro.revokedAt || registro.expiresAt < new Date()) {
    throw new AppError("Refresh token invalido ou expirado", 401);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.sub }, include: includePermissao });
  if (!usuario || !usuario.ativo) {
    throw new AppError("Usuario invalido ou inativo", 401);
  }

  // Rotacao: revoga o refresh token usado e emite um par novo.
  await prisma.refreshToken.update({
    where: { id: registro.id },
    data: { revokedAt: new Date() },
  });
  const tokens = await emitirTokens(usuario.id, usuario.role, usuario.email);

  return { ...tokens, usuario: sanitizeUsuario(usuario) };
}

export async function logout(
  tokenRecebido: string | undefined,
  usuarioId: string | undefined,
  ip: string | null,
) {
  if (tokenRecebido) {
    const tokenHash = hashToken(tokenRecebido);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  if (usuarioId) {
    await registrarAuditoria({ usuarioId, acao: "LOGOUT", entidade: "Usuario", entidadeId: usuarioId, ip });
  }
}

export async function trocarSenha(
  usuarioId: string,
  senhaAtual: string,
  novaSenha: string,
  ip: string | null,
) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new AppError("Usuario nao encontrado", 404);

  const senhaOk = await comparePassword(senhaAtual, usuario.senhaHash);
  if (!senhaOk) throw new AppError("Senha atual incorreta", 401);

  const novaSenhaHash = await hashPassword(novaSenha);
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { senhaHash: novaSenhaHash, precisaTrocarSenha: false },
  });

  // Revoga todas as sessoes ativas por seguranca apos troca de senha.
  await prisma.refreshToken.updateMany({
    where: { usuarioId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await registrarAuditoria({ usuarioId, acao: "TROCA_SENHA", entidade: "Usuario", entidadeId: usuarioId, ip });
}

// Fluxo mockado: nao ha envio real de email. O token e logado no console
// (simulando o link enviado) e, fora de producao, tambem devolvido na resposta
// da rota para facilitar teste manual/automatizado.
export async function esqueciSenha(email: string): Promise<string | null> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    // Nao revela se o email existe ou nao.
    return null;
  }

  const token = jwt.sign({ sub: usuario.id, proposito: "redefinir_senha" }, env.JWT_SECRET, {
    expiresIn: "15m",
  });

  console.log(`[MOCK EMAIL] Redefinicao de senha para ${email}: token=${token}`);

  return token;
}

export async function redefinirSenha(token: string, novaSenha: string, ip: string | null) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw new AppError("Token invalido ou expirado", 401);
  }

  if (payload.proposito !== "redefinir_senha" || typeof payload.sub !== "string") {
    throw new AppError("Token invalido", 401);
  }

  const novaSenhaHash = await hashPassword(novaSenha);
  await prisma.usuario.update({
    where: { id: payload.sub },
    data: { senhaHash: novaSenhaHash, precisaTrocarSenha: false },
  });

  await prisma.refreshToken.updateMany({
    where: { usuarioId: payload.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await registrarAuditoria({
    usuarioId: payload.sub,
    acao: "REDEFINICAO_SENHA",
    entidade: "Usuario",
    entidadeId: payload.sub,
    ip,
  });
}
