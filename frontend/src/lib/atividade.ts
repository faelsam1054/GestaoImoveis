// Timestamp da ultima atividade, persistido em localStorage para sobreviver a
// fechar/reabrir a aba. O idle-timer em memoria (use-idle-timer.ts) cobre o
// caso "aba aberta parada"; isto aqui cobre "aba fechada e reaberta depois do
// limite" (ver bootstrap do AuthContext).
const CHAVE = "ic_ultima_atividade";

export function registrarUltimaAtividade() {
  try {
    localStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // localStorage indisponivel (modo privado, quota) - autologout da aba
    // aberta continua funcionando via timer em memoria, so essa checagem
    // entre sessoes fica desativada nesse caso.
  }
}

export function inatividadeExcedida(limiteMs: number): boolean {
  try {
    const valor = localStorage.getItem(CHAVE);
    if (!valor) return false;
    return Date.now() - Number(valor) > limiteMs;
  } catch {
    return false;
  }
}

export function limparUltimaAtividade() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // ver registrarUltimaAtividade
  }
}
