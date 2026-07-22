export interface ParcelaCaucaoPreview {
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string; // YYYY-MM-DD
}

// Espelha calcularParcelasCaucao do backend (contratos.service.ts), so para
// pre-visualizacao no formulario antes de enviar. O backend recalcula/valida
// os valores de verdade ao criar o contrato.
export function calcularParcelasCaucaoPreview(
  valorTotal: number | undefined,
  numeroParcelas: number,
  dataInicio: string,
): ParcelaCaucaoPreview[] {
  if (!valorTotal || valorTotal <= 0 || numeroParcelas <= 1 || !dataInicio) return [];

  const centavosTotal = Math.round(valorTotal * 100);
  const centavosPorParcela = Math.floor(centavosTotal / numeroParcelas);
  let restante = centavosTotal;

  const [ano, mes, dia] = dataInicio.split("-").map(Number);
  const base = new Date(ano, mes - 1, dia);

  const parcelas: ParcelaCaucaoPreview[] = [];
  for (let i = 1; i <= numeroParcelas; i++) {
    const ehUltima = i === numeroParcelas;
    const centavos = ehUltima ? restante : centavosPorParcela;
    restante -= centavos;

    const vencimento = new Date(base);
    vencimento.setDate(vencimento.getDate() + (i - 1) * 30);

    parcelas.push({
      numeroParcela: i,
      valorParcela: centavos / 100,
      dataVencimento: vencimento.toISOString().slice(0, 10),
    });
  }
  return parcelas;
}
