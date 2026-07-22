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

function criarFileFilter(tiposPermitidos: Set<string>, mensagemErro: string) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (tiposPermitidos.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(mensagemErro, 400));
    }
  };
}

// subpasta: "imoveis", "manutencao", "pagamentos-admin" etc. Usada tanto para
// organizar o disco quanto para montar a URL publica servida em /uploads/<subpasta>.
// tiposPermitidos: por padrao aceita imagem+PDF; passe um subconjunto (ex: so PDF)
// para restringir o upload em rotas especificas.
export function criarUploadMiddleware(subpasta: string, tiposPermitidos: Set<string> = TIPOS_PERMITIDOS) {
  const somentePdf = tiposPermitidos.size === 1 && tiposPermitidos.has("application/pdf");
  const mensagemErro = somentePdf
    ? "Tipo de arquivo nao permitido. Envie um PDF."
    : "Tipo de arquivo nao permitido. Envie imagem (jpg/png/webp) ou PDF.";

  return multer({
    storage: storageParaSubpasta(subpasta),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: criarFileFilter(tiposPermitidos, mensagemErro),
  });
}

export function montarUrlArquivo(subpasta: string, filename: string): string {
  return `/uploads/${subpasta}/${filename}`;
}
