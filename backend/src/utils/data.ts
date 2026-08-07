// Meia-noite local de hoje. Usado como corte para classificar "atrasado":
// comparar contra o instante atual (new Date()) faria um vencimento marcar
// atrasado a partir da meia-noite do proprio dia do vencimento (ainda hoje).
// Comparando contra o inicio do dia, o vencimento so conta como atrasado a
// partir do dia seguinte (data_vencimento < inicioDeHoje()).
export function inicioDeHoje(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}
