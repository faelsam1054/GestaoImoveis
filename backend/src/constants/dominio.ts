// Listas de valores permitidos para os campos "String" que fariam enum em
// um banco com suporte nativo (SQLite nao suporta enum no Prisma).
// Usadas tanto nos schemas Zod quanto na logica de negocio.

export const STATUS_IMOVEL = ["vago", "alugado", "manutencao", "inativo"] as const;
export const STATUS_CONTRATO = ["ativo", "encerrado", "rescindido", "renovado"] as const;
export const TIPO_PAGAMENTO = ["aluguel", "caucao", "multa", "outro"] as const;
export const STATUS_PAGAMENTO = ["pendente", "pago", "atrasado"] as const;
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
export const STATUS_PAGAMENTO_ADMIN = ["pago", "pendente", "atrasado"] as const;
export const FORMA_PAGAMENTO_ADMIN = ["pix", "transferencia", "dinheiro"] as const;

export type StatusImovel = (typeof STATUS_IMOVEL)[number];
export type StatusContrato = (typeof STATUS_CONTRATO)[number];
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type StatusManutencao = (typeof STATUS_MANUTENCAO)[number];

// Ordem de progressao do workflow de manutencao: nao permite retroceder.
export const ORDEM_STATUS_MANUTENCAO: Record<StatusManutencao, number> = {
  orcamento: 0,
  aprovado: 1,
  executado: 2,
  pago: 3,
};
