import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type PDFDocument from "pdfkit";
import { env } from "../../config/env";
import { montarUrlArquivo } from "../../middlewares/upload.middleware";

export interface ArquivoSalvo {
  filename: string;
  url: string;
}

// Escreve o PDFDocument em disco (uploads/<subpasta>/<uuid>.pdf) e devolve a
// URL publica no mesmo formato usado pelos uploads via multer (/uploads/<subpasta>/...).
export function salvarPdf(subpasta: string, doc: PDFKit.PDFDocument): Promise<ArquivoSalvo> {
  const destino = path.join(env.UPLOADS_DIR, subpasta);
  fs.mkdirSync(destino, { recursive: true });
  const filename = `${crypto.randomUUID()}.pdf`;
  const caminhoAbsoluto = path.join(destino, filename);

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(caminhoAbsoluto);
    doc.pipe(stream);
    doc.end();
    stream.on("finish", () => resolve({ filename, url: montarUrlArquivo(subpasta, filename) }));
    stream.on("error", reject);
  });
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
