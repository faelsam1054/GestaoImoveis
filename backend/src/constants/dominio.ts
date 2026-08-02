// Listas de valores permitidos para os campos "String" que fariam enum em
// um banco com suporte nativo (SQLite nao suporta enum no Prisma).
// Usadas tanto nos schemas Zod quanto na logica de negocio.

export const STATUS_IMOVEL = ["vago", "alugado", "manutencao", "inativo"] as const;
export const STATUS_CONTRATO = ["pendente_aprovacao", "ativo", "rejeitado", "encerrado"] as const;
export const TIPO_PAGAMENTO = ["aluguel", "caucao", "multa", "outro"] as const;
// "cancelado": pagamento futuro pre-gerado (ver gerarPagamentosDoContrato)
// cujo contrato foi encerrado/renovado antes desse mes ser cobrado - nunca
// sera cobrado de verdade, mas o registro fica (nao e apagado) para auditoria.
export const STATUS_PAGAMENTO = ["pendente", "pago", "atrasado", "cancelado"] as const;
export const FORMA_PAGAMENTO = ["pix", "transferencia", "dinheiro", "boleto", "outro"] as const;
export const CATEGORIA_MANUTENCAO = [
  "pintura",
  "eletrica",
  "hidraulica",
  "estrutural",
  "limpeza",
  "jardinagem",
  "outros",
] as const;
export const STATUS_MANUTENCAO = ["orcamento", "aprovado", "executado", "pago"] as const;
export const ORIGEM_MANUTENCAO = ["proprietario", "chamado_inquilino"] as const;
export const RECORRENCIA_MANUTENCAO = ["unica", "mensal", "trimestral", "semestral", "anual"] as const;

// Meses a incrementar por ciclo de recorrencia, usado na geracao automatica
// de proximas instancias (ver manutencao.service.ts: gerarProximasRecorrencias).
export const MESES_POR_RECORRENCIA: Record<Exclude<(typeof RECORRENCIA_MANUTENCAO)[number], "unica">, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};
export const STATUS_PAGAMENTO_ADMIN = ["pago", "aguardando_pagamento", "atrasado"] as const;
export const PERCENTUAL_MENSALIDADE_ADMIN = 10;
export const FORMA_PAGAMENTO_ADMIN = ["pix", "transferencia", "dinheiro"] as const;

export type StatusImovel = (typeof STATUS_IMOVEL)[number];
export type StatusContrato = (typeof STATUS_CONTRATO)[number];
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type StatusManutencao = (typeof STATUS_MANUTENCAO)[number];
export type RecorrenciaManutencao = (typeof RECORRENCIA_MANUTENCAO)[number];

// Ordem de progressao do workflow de manutencao: nao permite retroceder.
export const ORDEM_STATUS_MANUTENCAO: Record<StatusManutencao, number> = {
  orcamento: 0,
  aprovado: 1,
  executado: 2,
  pago: 3,
};
