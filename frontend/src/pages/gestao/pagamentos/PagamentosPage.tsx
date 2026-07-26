import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Plus, Wallet, Undo2, Building2, ArrowUpNarrowWide, ArrowDownWideNarrow, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listarPagamentos,
  criarPagamentoAvulso,
  marcarPagamentoComoPago,
  desfazerPagamento,
  type FiltrosPagamento,
  type PagamentoAvulsoInput,
  type MarcarPagoInput,
} from "@/api/pagamentos";
import { listarContratos } from "@/api/contratos";
import { listarImoveis } from "@/api/imoveis";
import { useAuth } from "@/contexts/AuthContext";
import { FORMA_PAGAMENTO, TIPO_PAGAMENTO, type Pagamento } from "@/types/domain";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CurrencyInput } from "@/components/currency-input";
import { EmptyState } from "@/components/empty-state";
import { DateRangeFilter } from "@/components/date-range-filter";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AVULSO_VAZIO: PagamentoAvulsoInput = {
  contratoId: "",
  tipo: "multa",
  competencia: "",
  valorPrevisto: 0,
  dataVencimento: "",
  observacoes: "",
};

type AbaPagamento = "todos" | "atrasados" | "pagos";

interface Ordenacao {
  campo: "dataVencimento" | "valor";
  ordem: "asc" | "desc";
}

const ORDENACAO_PADRAO: Ordenacao = { campo: "dataVencimento", ordem: "asc" };
const CHAVE_ORDENACAO_STORAGE = "gestao-alugueis:pagamentos:ordenacao";

function carregarOrdenacaoSalva(): Ordenacao {
  try {
    const bruto = localStorage.getItem(CHAVE_ORDENACAO_STORAGE);
    if (!bruto) return ORDENACAO_PADRAO;
    const salvo = JSON.parse(bruto);
    if (
      (salvo.campo === "dataVencimento" || salvo.campo === "valor") &&
      (salvo.ordem === "asc" || salvo.ordem === "desc")
    ) {
      return salvo;
    }
  } catch {
    // localStorage corrompido/indisponivel - usa o padrao silenciosamente
  }
  return ORDENACAO_PADRAO;
}

export function PagamentosPage() {
  const { usuario } = useAuth();
  const podeRegistrar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeRegistrarPagamentos;
  const queryClient = useQueryClient();

  const [aba, setAba] = useState<AbaPagamento>("todos");
  const [periodo, setPeriodo] = useState<DateRange | undefined>(undefined);
  const [imovelId, setImovelId] = useState<string | undefined>(undefined);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>(carregarOrdenacaoSalva);
  const [dialogAvulsoAberto, setDialogAvulsoAberto] = useState(false);
  const [formAvulso, setFormAvulso] = useState<PagamentoAvulsoInput>(AVULSO_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const [pagando, setPagando] = useState<Pagamento | null>(null);
  const [formPagar, setFormPagar] = useState<MarcarPagoInput>({
    valorPago: 0,
    formaPagamento: "pix",
    observacoes: "",
  });

  const [desfazendo, setDesfazendo] = useState<Pagamento | null>(null);
  const [removerRecibo, setRemoverRecibo] = useState(true);

  const filtrosBase: Pick<FiltrosPagamento, "dataInicio" | "dataFim" | "imovelId"> = {
    dataInicio: periodo?.from ? format(periodo.from, "yyyy-MM-dd") : undefined,
    dataFim: periodo?.to ? format(periodo.to, "yyyy-MM-dd") : periodo?.from ? format(periodo.from, "yyyy-MM-dd") : undefined,
    imovelId,
  };
  const chaveFiltros = `${filtrosBase.dataInicio ?? ""}_${filtrosBase.dataFim ?? ""}_${imovelId ?? ""}`;

  function alterarOrdenacao(valor: string) {
    const [campo, ordem] = valor.split(":") as [Ordenacao["campo"], Ordenacao["ordem"]];
    const nova: Ordenacao = { campo, ordem };
    setOrdenacao(nova);
    localStorage.setItem(CHAVE_ORDENACAO_STORAGE, JSON.stringify(nova));
  }

  // Contagens exatas de cada aba (pageSize:1 - so interessa paginacao.total,
  // que reflete o total real mesmo alem do limite de 100 itens por pagina).
  // Acompanham periodo/imovel selecionados para o contador ficar coerente com a lista.
  const queryTotalTodos = useQuery({
    queryKey: ["pagamentos", "contagem", "todos", chaveFiltros],
    queryFn: () => listarPagamentos({ ...filtrosBase, pageSize: 1 }),
  });
  const queryTotalAtrasados = useQuery({
    queryKey: ["pagamentos", "contagem", "atrasado", chaveFiltros],
    queryFn: () => listarPagamentos({ ...filtrosBase, status: "atrasado", pageSize: 1 }),
  });
  const queryTotalPagos = useQuery({
    queryKey: ["pagamentos", "contagem", "pago", chaveFiltros],
    queryFn: () => listarPagamentos({ ...filtrosBase, status: "pago", pageSize: 1 }),
  });
  const contagens = {
    todos: queryTotalTodos.data?.paginacao.total,
    atrasados: queryTotalAtrasados.data?.paginacao.total,
    pagos: queryTotalPagos.data?.paginacao.total,
  };

  // Lista exibida: filtrada no servidor pela aba ativa, periodo e imovel
  // (evita o limite de 100 itens por pagina misturar filtros quando o total
  // geral e maior que isso).
  const { data: resultado, isLoading } = useQuery({
    queryKey: ["pagamentos", "lista", aba, chaveFiltros, ordenacao.campo, ordenacao.ordem],
    queryFn: () =>
      listarPagamentos({
        ...filtrosBase,
        ordenarPor: ordenacao.campo,
        ordem: ordenacao.ordem,
        ...(aba === "todos" ? {} : { status: aba === "atrasados" ? "atrasado" : "pago" }),
      }),
  });

  const { data: imoveis } = useQuery({
    queryKey: ["imoveis", "filtro-pagamentos"],
    queryFn: () => listarImoveis({ pageSize: 100 }),
  });

  const { data: contratosAtivos } = useQuery({
    queryKey: ["contratos", "ativo"],
    queryFn: () => listarContratos({ status: "ativo" }),
    enabled: dialogAvulsoAberto,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
  }

  const mutCriarAvulso = useMutation({
    mutationFn: (input: PagamentoAvulsoInput) => criarPagamentoAvulso(input),
    onSuccess: async () => {
      toast.success("Pagamento avulso lançado.");
      await invalidar();
      setDialogAvulsoAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutPagar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarcarPagoInput }) => marcarPagamentoComoPago(id, input),
    onSuccess: async () => {
      toast.success("Pagamento registrado.");
      await invalidar();
      setPagando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutDesfazer = useMutation({
    mutationFn: ({ id, removerRecibo }: { id: string; removerRecibo: boolean }) =>
      desfazerPagamento(id, removerRecibo),
    onSuccess: async () => {
      toast.success("Pagamento desfeito com sucesso");
      await invalidar();
      setDesfazendo(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  function abrirNovoAvulso() {
    setFormAvulso(AVULSO_VAZIO);
    setErro(null);
    setDialogAvulsoAberto(true);
  }

  function abrirPagar(pagamento: Pagamento) {
    setPagando(pagamento);
    setFormPagar({ valorPago: pagamento.valorPrevisto, formaPagamento: "pix", observacoes: "" });
    setErro(null);
  }

  function abrirDesfazer(pagamento: Pagamento) {
    setDesfazendo(pagamento);
    setRemoverRecibo(true);
  }

  function limparFiltros() {
    setPeriodo(undefined);
    setImovelId(undefined);
  }

  const quantidadeFiltrosAtivos = (periodo?.from ? 1 : 0) + (imovelId ? 1 : 0);
  const contadorResultados = `Mostrando ${resultado?.dados.length ?? 0} de ${contagens[aba] ?? "…"} pagamentos`;

  const pagamentos = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Pagamentos"
        descricao="Aluguéis, cauções e multas vinculados aos contratos."
        acoes={
          podeRegistrar ? (
            <Button onClick={abrirNovoAvulso}>
              <Plus className="h-4 w-4" />
              Lançamento Avulso
            </Button>
          ) : undefined
        }
      />

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaPagamento)} className="mb-3">
        <TabsList>
          <TabsTrigger value="todos">Todos{contagens.todos !== undefined ? ` (${contagens.todos})` : ""}</TabsTrigger>
          <TabsTrigger value="atrasados">
            Atrasados{contagens.atrasados !== undefined ? ` (${contagens.atrasados})` : ""}
          </TabsTrigger>
          <TabsTrigger value="pagos">Pagos{contagens.pagos !== undefined ? ` (${contagens.pagos})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4">
        {/* Desktop/tablet: filtros em linha horizontal */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <DateRangeFilter value={periodo} onChange={setPeriodo} />
          <Select value={imovelId ?? "todos"} onValueChange={(v) => setImovelId(v === "todos" ? undefined : v)}>
            <SelectTrigger className={cn(imovelId && "border-primary/50 text-foreground")}>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todos os imóveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os imóveis</SelectItem>
              {imoveis?.dados.map((imovel) => (
                <SelectItem key={imovel.id} value={imovel.id}>
                  {imovel.logradouro}, {imovel.numero} - {imovel.cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={`${ordenacao.campo}:${ordenacao.ordem}`} onValueChange={alterarOrdenacao}>
            <SelectTrigger>
              {ordenacao.ordem === "asc" ? (
                <ArrowUpNarrowWide className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
              )}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dataVencimento:asc">Vencimento: mais antigos primeiro</SelectItem>
              <SelectItem value="dataVencimento:desc">Vencimento: mais recentes primeiro</SelectItem>
              <SelectItem value="valor:desc">Maior valor primeiro</SelectItem>
              <SelectItem value="valor:asc">Menor valor primeiro</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{contadorResultados}</span>
          {quantidadeFiltrosAtivos > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={limparFiltros}>
              <X className="h-4 w-4" />
              Limpar todos os filtros
            </Button>
          )}
        </div>

        {/* Mobile: filtros dentro de um menu expansivel */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </span>
                {quantidadeFiltrosAtivos > 0 && <Badge variant="secondary">{quantidadeFiltrosAtivos}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] gap-0 overflow-y-auto">
              <SheetTitle className="border-b px-4 py-4">Filtros</SheetTitle>
              <div className="flex flex-col gap-3 p-4">
                <DateRangeFilter value={periodo} onChange={setPeriodo} className="w-full" />
                <Select value={imovelId ?? "todos"} onValueChange={(v) => setImovelId(v === "todos" ? undefined : v)}>
                  <SelectTrigger className={cn("w-full", imovelId && "border-primary/50 text-foreground")}>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Todos os imóveis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os imóveis</SelectItem>
                    {imoveis?.dados.map((imovel) => (
                      <SelectItem key={imovel.id} value={imovel.id}>
                        {imovel.logradouro}, {imovel.numero} - {imovel.cidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={`${ordenacao.campo}:${ordenacao.ordem}`} onValueChange={alterarOrdenacao}>
                  <SelectTrigger className="w-full">
                    {ordenacao.ordem === "asc" ? (
                      <ArrowUpNarrowWide className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
                    )}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dataVencimento:asc">Vencimento: mais antigos primeiro</SelectItem>
                    <SelectItem value="dataVencimento:desc">Vencimento: mais recentes primeiro</SelectItem>
                    <SelectItem value="valor:desc">Maior valor primeiro</SelectItem>
                    <SelectItem value="valor:asc">Menor valor primeiro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{contadorResultados}</p>
                {quantidadeFiltrosAtivos > 0 && (
                  <Button variant="outline" onClick={limparFiltros}>
                    <X className="h-4 w-4" />
                    Limpar todos os filtros
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && pagamentos.length === 0 && (
        <EmptyState
          icon={Wallet}
          titulo="Nenhum pagamento encontrado"
          descricao="Ajuste os filtros para ver outros pagamentos."
        />
      )}

      {!isLoading && pagamentos.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel / Inquilino</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((pagamento) => (
                  <TableRow key={pagamento.id}>
                    <TableCell>
                      <p className="font-medium">
                        {pagamento.contrato?.imovel?.logradouro}, {pagamento.contrato?.imovel?.numero}
                      </p>
                      <p className="text-xs text-muted-foreground">{pagamento.contrato?.inquilino?.usuario?.nome}</p>
                    </TableCell>
                    <TableCell className="capitalize">{pagamento.tipo}</TableCell>
                    <TableCell>{formatarCompetencia(pagamento.competencia)}</TableCell>
                    <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                    <TableCell>{formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}</TableCell>
                    <TableCell>
                      <StatusBadge status={pagamento.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {podeRegistrar && pagamento.status !== "pago" && (
                        <Button variant="outline" size="sm" onClick={() => abrirPagar(pagamento)}>
                          Marcar como pago
                        </Button>
                      )}
                      {podeRegistrar && pagamento.status === "pago" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 dark:text-amber-400"
                          onClick={() => abrirDesfazer(pagamento)}
                        >
                          <Undo2 className="h-4 w-4" />
                          Desfazer Pagamento
                        </Button>
                      )}
                      {pagamento.recibo && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={pagamento.recibo.caminhoArquivo} target="_blank" rel="noreferrer">
                            Recibo
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {pagamentos.map((pagamento) => (
              <MobileRowCard key={pagamento.id}>
                <MobileRowCardHeader>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {pagamento.contrato?.imovel?.logradouro}, {pagamento.contrato?.imovel?.numero}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {pagamento.contrato?.inquilino?.usuario?.nome}
                    </p>
                  </div>
                  <StatusBadge status={pagamento.status} />
                </MobileRowCardHeader>
                <MobileRowField label="Tipo" value={<span className="capitalize">{pagamento.tipo}</span>} />
                <MobileRowField label="Competência" value={formatarCompetencia(pagamento.competencia)} />
                <MobileRowField label="Vencimento" value={formatarData(pagamento.dataVencimento)} />
                <MobileRowField
                  label="Valor"
                  value={formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}
                />
                <MobileRowActions>
                  {podeRegistrar && pagamento.status !== "pago" && (
                    <Button variant="outline" size="sm" onClick={() => abrirPagar(pagamento)}>
                      Marcar como pago
                    </Button>
                  )}
                  {podeRegistrar && pagamento.status === "pago" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 dark:text-amber-400"
                      onClick={() => abrirDesfazer(pagamento)}
                    >
                      <Undo2 className="h-4 w-4" />
                      Desfazer Pagamento
                    </Button>
                  )}
                  {pagamento.recibo && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={pagamento.recibo.caminhoArquivo} target="_blank" rel="noreferrer">
                        Recibo
                      </a>
                    </Button>
                  )}
                </MobileRowActions>
              </MobileRowCard>
            ))}
          </div>
        </>
      )}

      {/* Lancamento avulso */}
      <Dialog open={dialogAvulsoAberto} onOpenChange={setDialogAvulsoAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lançamento Avulso</DialogTitle>
            <DialogDescription>Lance uma multa ou pagamento fora do cronograma automático.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Contrato</Label>
              <Select value={formAvulso.contratoId} onValueChange={(v) => setFormAvulso({ ...formAvulso, contratoId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {contratosAtivos?.dados.map((contrato) => (
                    <SelectItem key={contrato.id} value={contrato.id}>
                      {contrato.imovel?.logradouro} - {contrato.inquilino?.usuario?.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Tipo</Label>
                <Select
                  value={formAvulso.tipo}
                  onValueChange={(v) => setFormAvulso({ ...formAvulso, tipo: v as PagamentoAvulsoInput["tipo"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_PAGAMENTO.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="competencia">Competência (AAAA-MM)</Label>
                <Input
                  id="competencia"
                  placeholder="2026-08"
                  value={formAvulso.competencia}
                  onChange={(e) => setFormAvulso({ ...formAvulso, competencia: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="valorPrevisto">Valor</Label>
                <CurrencyInput
                  id="valorPrevisto"
                  value={formAvulso.valorPrevisto}
                  onValueChange={(v) => setFormAvulso({ ...formAvulso, valorPrevisto: v ?? 0 })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataVencimento">Vencimento</Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={formAvulso.dataVencimento}
                  onChange={(e) => setFormAvulso({ ...formAvulso, dataVencimento: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={formAvulso.observacoes}
                onChange={(e) => setFormAvulso({ ...formAvulso, observacoes: e.target.value })}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAvulsoAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErro(null);
                mutCriarAvulso.mutate(formAvulso);
              }}
              disabled={
                mutCriarAvulso.isPending ||
                !formAvulso.contratoId ||
                !formAvulso.competencia ||
                !formAvulso.dataVencimento
              }
            >
              {mutCriarAvulso.isPending ? "Lançando..." : "Lançar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marcar como pago */}
      <Dialog open={Boolean(pagando)} onOpenChange={(open) => !open && setPagando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              {pagando && `${formatarCompetencia(pagando.competencia)} - ${formatarMoeda(pagando.valorPrevisto)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valorPago">Valor pago</Label>
              <CurrencyInput
                id="valorPago"
                value={formPagar.valorPago}
                onValueChange={(v) => setFormPagar({ ...formPagar, valorPago: v ?? 0 })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={formPagar.formaPagamento}
                onValueChange={(v) => setFormPagar({ ...formPagar, formaPagamento: v as MarcarPagoInput["formaPagamento"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="obsPagar">Observações</Label>
              <Input
                id="obsPagar"
                value={formPagar.observacoes}
                onChange={(e) => setFormPagar({ ...formPagar, observacoes: e.target.value })}
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPagando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErro(null);
                if (pagando) mutPagar.mutate({ id: pagando.id, input: formPagar });
              }}
              disabled={mutPagar.isPending || formPagar.valorPago <= 0}
            >
              {mutPagar.isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Desfazer pagamento */}
      <Dialog open={Boolean(desfazendo)} onOpenChange={(open) => !open && setDesfazendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desfazer Pagamento</DialogTitle>
            <DialogDescription>
              O pagamento será marcado como pendente novamente. Deseja também remover o recibo gerado?
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={removerRecibo} onCheckedChange={(v) => setRemoverRecibo(v === true)} />
            Remover recibo PDF também
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesfazendo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => desfazendo && mutDesfazer.mutate({ id: desfazendo.id, removerRecibo })}
              disabled={mutDesfazer.isPending}
            >
              {mutDesfazer.isPending ? "Desfazendo..." : "Desfazer Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
