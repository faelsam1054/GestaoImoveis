import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import path from "node:path";
import { env } from "../config/env";

// Client server-side com a service role key: acesso total ao bucket,
// ignora RLS de propósito (não é usado por nenhum browser/usuário final,
// só pelo backend depois de já ter validado autenticacao/permissao).
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Bucket unico e publico pra tudo (fotos de imovel, PDFs de contrato/recibo/
// comprovante). Os PDFs de aditivo tambem vao aqui, mas sua URL nunca e
// devolvida direto pro frontend - so acessivel via a rota autenticada de
// download (ver aditivos.controller.ts), que busca os bytes server-side com
// baixarArquivo(). Isso preserva a mesma protecao que a versao em disco
// tinha (nome de arquivo aleatorio, so alcancavel por uma rota com auth),
// sem precisar de um segundo bucket privado.
const BUCKET = "uploads";

export interface ArquivoEnviado {
  filename: string;
  url: string;
}

// Envia um arquivo (buffer em memoria - vindo do multer com memoryStorage,
// ou de um PDF gerado com pdfkit) para o Supabase Storage.
export async function enviarArquivo(
  subpasta: string,
  buffer: Buffer,
  nomeOriginal: string,
  contentType: string,
): Promise<ArquivoEnviado> {
  const filename = `${crypto.randomUUID()}${path.extname(nomeOriginal)}`;
  const caminho = `${subpasta}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar arquivo para o Storage: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  return { filename, url: data.publicUrl };
}

// Baixa os bytes de um arquivo do Storage a partir da URL publica salva no
// banco (usado pela rota autenticada de download de aditivos - ver acima).
export async function baixarArquivo(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const caminho = caminhoDoStorage(url);
  const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
  if (error) throw new Error(`Falha ao baixar arquivo do Storage: ${error.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || null };
}

// Remove um arquivo do Storage (ex: ao substituir ou apagar um anexo).
// Falha silenciosamente (so loga) - o objetivo e evitar acumular lixo, nao e
// critico o suficiente pra interromper o fluxo principal.
export async function removerArquivo(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const caminho = caminhoDoStorage(url);
  const { error } = await supabase.storage.from(BUCKET).remove([caminho]);
  if (error) console.error("Falha ao remover arquivo do Storage:", caminho, error.message);
}

// Extrai "<subpasta>/<filename>" a partir da URL publica retornada por
// enviarArquivo (formato: .../storage/v1/object/public/uploads/<subpasta>/<filename>).
function caminhoDoStorage(url: string): string {
  const marcador = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marcador);
  if (idx === -1) throw new Error(`URL de storage invalida (fora do bucket "${BUCKET}"): ${url}`);
  return url.slice(idx + marcador.length);
}
