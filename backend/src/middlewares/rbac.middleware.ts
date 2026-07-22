import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import type { PermissaoKey, Role } from "../types/rbac";

// Gate grosso por role. Uso tipico: rotas exclusivas do proprietario
// (ex: cadastrar administrador) ou exclusivas do inquilino (rotas /me/*).
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Nao autenticado", 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Acesso negado para este perfil", 403));
    }
    next();
  };
}

// Gate fino para rotas compartilhadas entre Proprietario e Administrador.
// Proprietario sempre passa. Administrador so passa se a permissao granular
// correspondente estiver marcada em PermissaoAdministrador. Inquilino nunca passa
// (ele usa suas proprias rotas /me/*, sem depender deste middleware).
export function authorizePermissao(chave: PermissaoKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError("Nao autenticado", 401);

      if (req.user.role === "proprietario") return next();

      if (req.user.role === "administrador") {
        const permissao = await prisma.permissaoAdministrador.findUnique({
          where: { usuarioId: req.user.id },
        });
        if (permissao?.[chave]) return next();
        throw new AppError("Sem permissao para acessar este recurso", 403);
      }

      throw new AppError("Acesso negado", 403);
    } catch (err) {
      next(err);
    }
  };
}
