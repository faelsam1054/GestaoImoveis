import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

// Garante que um usuario so mexa no proprio registro (ex: PUT /usuarios/:usuarioId/perfil).
// Proprietario sempre passa (acesso total). Demais roles so passam se o :param
// da rota bater com o proprio id do usuario autenticado.
export function requireSelf(paramName = "usuarioId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Nao autenticado", 401));
    if (req.user.role === "proprietario") return next();

    const alvoId = req.params[paramName];
    if (req.user.id !== alvoId) {
      return next(new AppError("Voce so pode acessar seus proprios dados", 403));
    }
    next();
  };
}
