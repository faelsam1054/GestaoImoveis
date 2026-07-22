import multer, { type FileFilterCallback } from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { Request } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function storageParaSubpasta(subpasta: string) {
  const destino = path.join(env.UPLOADS_DIR, subpasta);
  fs.mkdirSync(destino, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destino),
    filename: (_req, file, cb) => {
      const nomeUnico = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      cb(null, nomeUnico);
    },
  });
}

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (TIPOS_PERMITIDOS.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Tipo de arquivo nao permitido. Envie imagem (jpg/png/webp) ou PDF.", 400));
  }
}

// subpasta: "imoveis", "manutencao", "pagamentos-admin" etc. Usada tanto para
// organizar o disco quanto para montar a URL publica servida em /uploads/<subpasta>.
export function criarUploadMiddleware(subpasta: string) {
  return multer({
    storage: storageParaSubpasta(subpasta),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  });
}

export function montarUrlArquivo(subpasta: string, filename: string): string {
  return `/uploads/${subpasta}/${filename}`;
}
