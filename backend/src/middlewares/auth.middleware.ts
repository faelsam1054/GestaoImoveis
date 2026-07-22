import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { prisma } from "../lib/prisma";
import type { Role } from "../types/rbac";

// Exige um access token valido no header Authorization e popula req.user.
// Consulta o banco (campos minimos) para garantir que a conta ainda esta ativa,
// evitando que um usuario desativado continue usando um token ja emitido.
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Token de acesso ausente", 401);
    }
    const token = header.slice("Bearer ".length);

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError("Token de acesso invalido ou expirado", 401);
    }
    if (payload.tipo !== "access") {
      throw new AppError("Token invalido", 401);
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, email: true, ativo: true },
    });
    if (!usuario || !usuario.ativo) {
      throw new AppError("Usuario invalido ou inativo", 401);
    }

    req.user = {
      id: usuario.id,
      role: usuario.role as Role,
      email: usuario.email,
    };
    next();
  } catch (err) {
    next(err);
  }
}
