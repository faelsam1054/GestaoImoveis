// Config centralizada do autologout por inatividade - mesmo valor pros tres
// perfis (Proprietario/Administrador/Inquilino) por enquanto.
export const SESSION_CONFIG = {
  TIMEOUT: 10 * 60 * 1000, // 10 min sem atividade -> logout automatico
  WARNING_BEFORE: 60 * 1000, // mostra o aviso 1 min antes de expirar
} as const;
