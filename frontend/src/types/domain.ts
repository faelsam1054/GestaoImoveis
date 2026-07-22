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
  contratoAnteriorId: string | null;
  arquivoPdfUrl: string | null;
  contratoAssinadoUrl: string | null;
  pagamentos?: Pagamento[];
  caucaoParcelas?: CaucaoParcela[];
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
  comprovantePdfUrl: string | null;
  observacoes: string | null;
  origem: "proprietario" | "chamado_inquilino";
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

export interface PagamentoAdministrador {
  id: string;
  administradorId: string;
  administrador?: { id: string; nome: string; email: string };
  mesReferencia: string;
  valorPago: number | null;
  dataPagamento: string | null;
  dataVencimento: string;
  status: "pago" | "pendente" | "atrasado";
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
