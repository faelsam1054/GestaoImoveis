import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { AppError } from "../utils/AppError";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ erro: err.message, detalhes: err.details, codigo: err.codigo });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({ erro: "Dados invalidos", detalhes: err.flatten() });
    return;
  }

  if (err instanceof MulterError) {
    res.status(400).json({ erro: "Falha no upload do arquivo", detalhes: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ erro: "Registro duplicado", detalhes: err.meta });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ erro: "Registro nao encontrado" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor" });
};
