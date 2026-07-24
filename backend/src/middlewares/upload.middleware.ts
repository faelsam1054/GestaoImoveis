import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { AppError } from "../utils/AppError";

const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function criarFileFilter(tiposPermitidos: Set<string>, mensagemErro: string) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (tiposPermitidos.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(mensagemErro, 400));
    }
  };
}

const TAMANHO_MAXIMO_PADRAO = 5 * 1024 * 1024;

// Guarda o arquivo em memoria (req.file.buffer) em vez de disco - necessario
// em ambiente serverless (Vercel), onde o filesystem e efemero. Quem recebe
// o upload e responsavel por enviar o buffer pro Supabase Storage, informando
// a subpasta destino nesse momento (ver src/lib/storage.ts: enviarArquivo).
// tiposPermitidos: por padrao aceita imagem+PDF; passe um subconjunto (ex: so PDF)
// para restringir o upload em rotas especificas.
// maxSizeBytes: por padrao 5MB; algumas rotas (ex: contrato assinado) pedem um
// limite proprio, entao e configuravel por instancia em vez de global fixo.
export function criarUploadMiddleware(
  tiposPermitidos: Set<string> = TIPOS_PERMITIDOS,
  maxSizeBytes: number = TAMANHO_MAXIMO_PADRAO,
) {
  const somentePdf = tiposPermitidos.size === 1 && tiposPermitidos.has("application/pdf");
  const mensagemErro = somentePdf
    ? "Tipo de arquivo nao permitido. Envie um PDF."
    : "Tipo de arquivo nao permitido. Envie imagem (jpg/png/webp) ou PDF.";

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeBytes },
    fileFilter: criarFileFilter(tiposPermitidos, mensagemErro),
  });
}
