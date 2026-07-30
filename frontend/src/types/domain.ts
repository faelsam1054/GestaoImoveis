export const STATUS_IMOVEL = ["vago", "alugado", "manutencao", "inativo"] as const;
export const STATUS_CONTRATO = ["pendente_aprovacao", "ativo", "rejeitado", "encerrado"] as const;
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
export const RECORRENCIA_MANUTENCAO = ["unica", "mensal", "trimestral", "semestral", "anual"] as const;
export const FORMA_PAGAMENTO_ADMIN = ["pix", "transferencia", "dinheiro"] as const;
export const FORMA_PAGAMENTO_CAUCAO = ["pix", "transferencia", "dinheiro", "outros"] as const;
export const STATUS_CAUCAO_PARCELA = ["pendente", "pago", "atrasado"] as const;

export type StatusImovel = (typeof STATUS_IMOVEL)[number];
export type StatusContrato = (typeof STATUS_CONTRATO)[number];
export type TipoPagamento = (typeof TIPO_PAGAMENTO)[number];
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type FormaPagamento = (typeof FORMA_PAGAMENTO)[number];
export type CategoriaManutencao = (typeof CATEGORIA_MANUTENCAO)[number];
export type StatusManutencao = (typeof STATUS_MANUTENCAO)[number];
export type RecorrenciaManutencao = (typeof RECORRENCIA_MANUTENCAO)[number];
export type FormaPagamentoAdmin = (typeof FORMA_PAGAMENTO_ADMIN)[number];
export type FormaPagamentoCaucao = (typeof FORMA_PAGAMENTO_CAUCAO)[number];
export type StatusCaucaoParcela = (typeof STATUS_CAUCAO_PARCELA)[number];

export interface Paginado<T> {
  dados: T[];
  paginacao: { page: number; pageSize: number; total: number; totalPaginas: number };
}

export interface TipoImovel {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export interface ImovelFoto {
  id: string;
  imovelId: string;
  url: string;
}

export interface Imovel {
  id: string;
  tipoImovelId: string;
  tipoImovel?: TipoImovel;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  valorAluguelBase: number;
  descricao: string | null;
  status: StatusImovel;
  excluidoEm: string | null;
  fotos?: ImovelFoto[];
  gastoTotalManutencao?: number;
  contratos?: Contrato[];
  gastosManutencao?: GastoManutencao[];
}

export interface UsuarioResumo {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  precisaTrocarSenha: boolean;
}

export interface Inquilino {
  id: string;
  usuarioId: string;
  usuario?: UsuarioResumo;
  cpf: string;
  telefone: string;
  contatoEmergenciaNome: string | null;
  contatoEmergenciaTelefone: string | null;
  excluidoEm: string | null;
  contratos?: Contrato[];
}

export interface Contrato {
  id: string;
  imovelId: string;
  imovel?: Imovel;
  inquilinoId: string;
  inquilino?: Inquilino;
  dataInicio: string;
  dataFim: string;
  diaVencimento: number;
  valorAluguel: number;
  valorCaucao: number | null;
  caucaoNumeroParcelas: number;
  status: StatusContrato;
  motivoRejeicao: string | null;
  dataRejeicao: string | null;
  dataAprovacao: string | null;
  criadoPorId: string | null;
  criadoPor?: { nome: string; email: string } | null;
  aprovadoPorId: string | null;
  contratoAnteriorId: string | null;
  arquivoPdfUrl: string | null;
  contratoAssinadoUrl: string | null;
  quebraContratoUrl: string | null;
  pagamentos?: Pagamento[];
  caucaoParcelas?: CaucaoParcela[];
}

export interface AditivoContrato {
  id: string;
  contratoId: string;
  contratoAnteriorId: string | null;
  descricaoAlteracoes: string;
  arquivoPdfUrl: string;
  dataAditivo: string;
  valorAnterior: number | null;
  valorNovo: number | null;
  criadoPorId: string;
  criadoPor?: { nome: string; email: string };
  createdAt: string;
}

export interface EmailEnviado {
  id: string;
  destinatario: string;
  assunto: string;
  corpo: string;
  modoMock: boolean;
  enviadoEm: string;
}

export interface CaucaoParcela {
  id: string;
  contratoId: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string;
  dataPagamento: string | null;
  status: StatusCaucaoParcela;
  formaPagamento: FormaPagamentoCaucao | null;
  observacoes: string | null;
  reciboPdfUrl: string | null;
}

export interface Pagamento {
  id: string;
  contratoId: string;
  contrato?: Contrato;
  tipo: TipoPagamento;
  competencia: string;
  valorPrevisto: number;
  valorPago: number | null;
  dataVencimento: string;
  dataPagamento: string | null;
  status: StatusPagamento;
  formaPagamento: FormaPagamento | null;
  observacoes: string | null;
  recibo?: { id: string; caminhoArquivo: string } | null;
  comprovanteUrl: string | null;
  comprovanteNomeOriginal: string | null;
  comprovanteTamanho: number | null;
  comprovanteUploadEm: string | null;
}

export interface GastoManutencao {
  id: string;
  imovelId: string;
  imovel?: Imovel;
  descricao: string;
  categoria: CategoriaManutencao;
  valor: number;
  dataExecucao: string | null;
  prestadorNome: string | null;
  prestadorDocumento: string | null;
  prestadorTelefone: string | null;
  status: StatusManutencao;
  dataPagamento: string | null;
  formaPagamento: FormaPagamento | null;
  comprovantePdfUrl: string | null;
  comprovanteNomeOriginal: string | null;
  comprovanteTamanho: number | null;
  comprovanteUploadEm: string | null;
  observacoes: string | null;
  origem: "proprietario" | "chamado_inquilino";
  excluidoEm: string | null;
  recorrencia: RecorrenciaManutencao;
  dataFimRecorrencia: string | null;
  ativo: boolean;
  manutencaoOrigemId: string | null;
}

export interface PermissaoAdministrador {
  podeVerImoveis: boolean;
  podeEditarImoveis: boolean;
  podeVerInquilinos: boolean;
  podeEditarInquilinos: boolean;
  podeVerContratos: boolean;
  podeEditarContratos: boolean;
  podeVerPagamentos: boolean;
  podeRegistrarPagamentos: boolean;
  podeVerManutencao: boolean;
  podeCadastrarManutencao: boolean;
  podeVerAdministradores: boolean;
  podeEditarPerfil: boolean;
}

export interface Administrador {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  permissaoAdministrador: PermissaoAdministrador | null;
  totalImoveisVinculados?: number;
}

export interface Proprietario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  createdAt: string;
}

export interface PagamentoAdministrador {
  id: string;
  administradorId: string;
  administrador?: { id: string; nome: string; email: string };
  mesReferencia: string;
  quantidadeImoveis: number;
  valorTotalAlugueis: number;
  percentual: number;
  valorPrevisto: number;
  valorPago: number | null;
  dataPagamento: string | null;
  dataVencimento: string;
  status: "pago" | "aguardando_pagamento" | "atrasado";
  formaPagamento: FormaPagamentoAdmin | null;
  observacoes: string | null;
}

export interface LogAuditoria {
  id: string;
  usuarioId: string | null;
  usuario?: { nome: string; email: string; role: string } | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
  ip: string | null;
  createdAt: string;
}

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  entidade: string | null;
  entidadeId: string | null;
  lida: boolean;
  lidaEm: string | null;
  createdAt: string;
}
