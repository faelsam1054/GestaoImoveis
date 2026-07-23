// Dispara o download de um Blob ja obtido (ex: via axios responseType:"blob"),
// contornando a falta de header de autenticacao que um <a href> simples teria.
export function dispararDownloadBlob(blob: Blob, nomeArquivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
