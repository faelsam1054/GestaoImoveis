import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../types/rbac";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
  tipo: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  tipo: "refresh";
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "tipo">): string {
  return jwt.sign({ ...payload, tipo: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "tipo">): string {
  return jwt.sign({ ...payload, tipo: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
