import type PDFDocument from "pdfkit";
import { enviarArquivo, type ArquivoEnviado } from "../../lib/storage";

export type ArquivoSalvo = ArquivoEnviado;

// Coleta o PDFDocument inteiro em memoria (sem tocar disco - necessario em
// serverless) e envia pro Supabase Storage, devolvendo a URL publica no
// mesmo formato usado pelos uploads via multer.
export function salvarPdf(subpasta: string, doc: PDFKit.PDFDocument): Promise<ArquivoSalvo> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      enviarArquivo(subpasta, buffer, "documento.pdf", "application/pdf").then(resolve, reject);
    });
    doc.on("error", reject);
    doc.end();
  });
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
