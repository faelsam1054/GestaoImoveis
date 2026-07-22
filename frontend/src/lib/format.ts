export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(data: string | null | undefined): string {
  if (!data) return "-";
  return new Date(data).toLocaleString("pt-BR");
}

export function formatarCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-");
  const nomesMes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${nomesMes[Number(mes) - 1]}/${ano}`;
}

// Input type="date" espera "YYYY-MM-DD"; converte uma data ISO para esse formato.
export function paraInputData(data: string | null | undefined): string {
  if (!data) return "";
  return data.slice(0, 10);
}
