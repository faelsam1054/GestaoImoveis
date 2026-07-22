// Conversor simples de array de objetos "flat" para CSV (RFC 4180 basico).
export function paraCsv(linhas: Record<string, unknown>[]): string {
  if (linhas.length === 0) return "";

  const colunas = Object.keys(linhas[0]);
  const escapar = (valor: unknown): string => {
    const texto = String(valor ?? "");
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const cabecalho = colunas.join(",");
  const corpo = linhas.map((linha) => colunas.map((coluna) => escapar(linha[coluna])).join(","));

  return [cabecalho, ...corpo].join("\n");
}
