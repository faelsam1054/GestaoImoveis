import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, FileText, ChevronDown, ChevronRight, Paperclip } from "lucide-react";
import {
  listarContratos,
  criarContrato,
  encerrarContrato,
  renovarContrato,
  excluirContrato,
  enviarContratoAssinado,
  type ContratoInput,
  type RenovarContratoInput,
} from "@/api/contratos";
import { criarAditivo } from "@/api/aditivos";
import { listarImoveis } from "@/api/imoveis";
import { listarInquilinos } from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import type { Contrato } from "@/types/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { calcularParcelasCaucaoPreview } from "@/lib/caucao";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { DoubleConfirmDialog } from "@/components/double-confirm-dialog";
import { CurrencyInput } from "@/components/currency-input";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Sempre retorna um inteiro entre 1 e 31 - evita NaN (campo vazio), valores
// fora do intervalo e outros estados intermediarios invalidos enquanto o
// usuario digita.
function parseDiaVencimento(valor: string): number {
  const numero = Math.trunc(Number(valor));
  if (!Number.isFinite(numero)) return 1;
  return Math.min(31, Math.max(1, numero));
}

const FORM_VAZIO: ContratoInput = {
  imovelId: "",
  inquilinoId: "",
  dataInicio: "",
  dataFim: "",
  diaVencimento: 5,
  valorAluguel: 0,
  valorCaucao: undefined,
  caucaoNumeroParcelas: 1,
};

function SeletorParcelasCaucao({
  valor,
  onChange,
}: {
  valor: 1 | 2 | 3 | undefined;
  onChange: (v: 1 | 2 | 3) => void;
}) {
  return (
    <Select value={String(valor ?? 1)} onValueChange={(v) => onChange(Number(v) as 1 | 2 | 3)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">1x (à vista)</SelectItem>
        <SelectItem value="2">2x</SelectItem>
        <SelectItem value="3">3x</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PreviewParcelasCaucao({
  valorCaucao,
  numeroParcelas,
  dataInicio,
}: {
  valorCaucao: number | undefined;
  numeroParcelas: number;
  dataInicio: string;
}) {
  if (numeroParcelas <= 1) return null;
  const parcelas = calcularParcelasCaucaoPreview(valorCaucao, numeroParcelas, dataInicio);
  if (parcelas.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Informe a data de início e o valor da caução para pré-visualizar as parcelas.
      </p>
    );
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parcela</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento sugerido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.map((p) => (
            <TableRow key={p.numeroParcela}>
              <TableCell>
                {p.numeroParcela} de {numeroParcelas}
              </TableCell>
              <TableCell>{formatarMoeda(p.valorParcela)}</TableCell>
              <TableCell>{formatarData(p.dataVencimento)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Listagem geral so mostra contratos ativo/encerrado - pendente_aprovacao e
// rejeitado ficam exclusivamente na tela "Contratos Pendentes".
type AbaContrato = "todos" | "ativo" | "encerrado";

export function ContratosPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarContratos;
  const ehProprietario = usuario?.role === "proprietario";
  const queryClient = useQueryClient();

  const [aba, setAba] = useState<AbaContrato>("todos");
  const [excluindo, setExcluindo] = useState<Contrato | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<ContratoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [mostrarUploadPdf, setMostrarUploadPdf] = useState(false);
  const inputArquivoContratoRef = useRef<HTMLInputElement>(null);
  const [arquivoQuebra, setArquivoQuebra] = useState<File | null>(null);
  const [erroArquivoQuebra, setErroArquivoQuebra] = useState<string | null>(null);
  const inputArquivoQuebraRef = useRef<HTMLInputElement>(null);

  const [contratoRenovando, setContratoRenovando] = useState<Contrato | null>(null);
  const [formRenovacao, setFormRenovacao] = useState<RenovarContratoInput>({
    dataInicio: "",
    dataFim: "",
    diaVencimento: 5,
    valorAluguel: 0,
    valorCaucao: undefined,
    caucaoNumeroParcelas: 1,
  });
  const [possuiAditivo, setPossuiAditivo] = useState(false);
  const [formAditivoRenovacao, setFormAditivoRenovacao] = useState({
    descricaoAlteracoes: "",
    valorAnterior: undefined as number | undefined,
    valorNovo: undefined as number | undefined,
  });
  const [arquivoAditivoRenovacao, setArquivoAditivoRenovacao] = useState<File | null>(null);
  const inputAditivoRenovacaoRef = useRef<HTMLInputElement>(null);

  const [confirmacao, setConfirmacao] = useState<Contrato | null>(null);

  // Busca unica (sem filtro de status no servidor) - o backend ja restringe a
  // ativo/encerrado, entao as 3 abas sao só um filtro local, sem refetch.
  const { data: resultado, isLoading } = useQuery({
    queryKey: ["contratos"],
    queryFn: () => listarContratos(),
  });

  const { data: imoveisVagos } = useQuery({
    queryKey: ["imoveis", "vago"],
    queryFn: () => listarImoveis({ status: "vago" }),
    enabled: dialogAberto,
  });

  const { data: inquilinosResultado } = useQuery({
    queryKey: ["inquilinos", ""],
    queryFn: () => listarInquilinos(),
    enabled: dialogAberto,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["contratos"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: ContratoInput) => criarContrato(input),
    onSuccess: async (contrato) => {
      if (contrato.status === "pendente_aprovacao") {
        toast.success("Contrato enviado para aprovação do Proprietário.");
      } else {
        toast.success("Contrato criado. Pagamentos gerados automaticamente.");
      }
      if (arquivoContrato) {
        try {
          await enviarContratoAssinado(contrato.id, arquivoContrato);
          toast.success("PDF do contrato assinado anexado.");
        } catch (err) {
          toast.error(`O contrato foi criado, mas houve um erro ao anexar o PDF: ${mensagemErro(err)}`);
        }
      }
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["imoveis"] });
      await queryClient.invalidateQueries({ queryKey: ["contratos", "pendentes-aprovacao"] });
      setDialogAberto(false);
      setArquivoContrato(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutEncerrar = useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo?: File }) => encerrarContrato(id, arquivo),
    onSuccess: async () => {
      toast.success("Contrato encerrado.");
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["imoveis"] });
      setConfirmacao(null);
      setArquivoQuebra(null);
      setErroArquivoQuebra(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRenovar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RenovarContratoInput }) => renovarContrato(id, input),
    onSuccess: async (novoContrato, variables) => {
      toast.success("Contrato renovado.");
      if (possuiAditivo && arquivoAditivoRenovacao) {
        try {
          await criarAditivo(novoContrato.id, {
            descricaoAlteracoes: formAditivoRenovacao.descricaoAlteracoes,
            valorAnterior: formAditivoRenovacao.valorAnterior,
            valorNovo: formAditivoRenovacao.valorNovo,
            contratoAnteriorId: variables.id,
            arquivo: arquivoAditivoRenovacao,
          });
          toast.success("Aditivo de renovação anexado.");
        } catch (err) {
          toast.error(`O contrato foi renovado, mas houve um erro ao anexar o aditivo: ${mensagemErro(err)}`);
        }
      }
      await invalidar();
      setContratoRenovando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => excluirContrato(id),
    onSuccess: async () => {
      toast.success("Contrato excluído definitivamente.");
      await invalidar();
      setExcluindo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindo(null);
    },
  });

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro(null);
    setArquivoContrato(null);
    setErroArquivo(null);
    setMostrarUploadPdf(false);
    setDialogAberto(true);
  }

  function selecionarArquivoContrato(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    if (arquivo) {
      if (arquivo.type !== "application/pdf") {
        setErroArquivo("Envie um arquivo PDF.");
        setArquivoContrato(null);
        e.target.value = "";
        return;
      }
      if (arquivo.size > 10 * 1024 * 1024) {
        setErroArquivo("O arquivo deve ter no máximo 10MB.");
        setArquivoContrato(null);
        e.target.value = "";
        return;
      }
    }
    setErroArquivo(null);
    setArquivoContrato(arquivo);
  }

  function selecionarArquivoQuebra(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    if (arquivo) {
      if (arquivo.type !== "application/pdf") {
        setErroArquivoQuebra("Envie um arquivo PDF.");
        setArquivoQuebra(null);
        e.target.value = "";
        return;
      }
      if (arquivo.size > 10 * 1024 * 1024) {
        setErroArquivoQuebra("O arquivo deve ter no máximo 10MB.");
        setArquivoQuebra(null);
        e.target.value = "";
        return;
      }
    }
    setErroArquivoQuebra(null);
    setArquivoQuebra(arquivo);
  }

  function abrirRenovacao(contrato: Contrato) {
    setContratoRenovando(contrato);
    setFormRenovacao({
      dataInicio: "",
      dataFim: "",
      diaVencimento: contrato.diaVencimento,
      valorAluguel: contrato.valorAluguel,
      valorCaucao: contrato.valorCaucao ?? undefined,
      caucaoNumeroParcelas: (contrato.caucaoNumeroParcelas ?? 1) as 1 | 2 | 3,
    });
    setPossuiAditivo(false);
    setFormAditivoRenovacao({
      descricaoAlteracoes: "",
      valorAnterior: contrato.valorAluguel,
      valorNovo: contrato.valorAluguel,
    });
    setArquivoAditivoRenovacao(null);
    setErro(null);
  }

  const salvando = mutCriar.isPending;
  const contratosTodos = resultado?.dados ?? [];
  const contagens = useMemo(
    () => ({
      todos: contratosTodos.length,
      ativo: contratosTodos.filter((c) => c.status === "ativo").length,
      encerrado: contratosTodos.filter((c) => c.status === "encerrado").length,
    }),
    [contratosTodos],
  );
  const contratos = aba === "todos" ? contratosTodos : contratosTodos.filter((c) => c.status === aba);

  return (
    <div>
      <PageHeader
        titulo="Contratos"
        descricao="Vínculo entre imóveis e inquilinos, com geração automática de pagamentos."
        acoes={
          podeEditar ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          ) : undefined
        }
      />

      <Tabs value={aba} onValueChange={(v) => setAba(v as AbaContrato)} className="mb-4">
        <TabsList>
          <TabsTrigger value="todos">Todos ({contagens.todos})</TabsTrigger>
          <TabsTrigger value="ativo">Ativo ({contagens.ativo})</TabsTrigger>
          <TabsTrigger value="encerrado">Encerrado ({contagens.encerrado})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && contratos.length === 0 && (
        <EmptyState
          icon={FileText}
          titulo="Nenhum contrato encontrado"
          descricao="Ajuste os filtros ou crie um novo contrato para começar."
        />
      )}

      {!isLoading && contratos.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell>
                      {contrato.imovel?.logradouro}, {contrato.imovel?.numero}
                    </TableCell>
                    <TableCell>{contrato.inquilino?.usuario?.nome}</TableCell>
                    <TableCell>
                      {formatarData(contrato.dataInicio)} - {formatarData(contrato.dataFim)}
                    </TableCell>
                    <TableCell>{formatarMoeda(contrato.valorAluguel)}</TableCell>
                    <TableCell>
                      <StatusBadge status={contrato.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/contratos/${contrato.id}`}>Detalhes</Link>
                      </Button>
                      {podeEditar && contrato.status === "ativo" && (
                        <>
                          {ehProprietario ? (
                            <Button variant="ghost" size="sm" onClick={() => abrirRenovacao(contrato)}>
                              Renovar
                            </Button>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button variant="ghost" size="sm" disabled>
                                    Renovar
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Apenas o Proprietário pode alterar valores contratuais</TooltipContent>
                            </Tooltip>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setConfirmacao(contrato)}>
                            Encerrar
                          </Button>
                        </>
                      )}
                      {podeEditar && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setExcluindo(contrato)}>
                          Excluir
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
            {contratos.map((contrato) => (
              <MobileRowCard key={contrato.id}>
                <MobileRowCardHeader>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {contrato.imovel?.logradouro}, {contrato.imovel?.numero}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{contrato.inquilino?.usuario?.nome}</p>
                  </div>
                  <StatusBadge status={contrato.status} />
                </MobileRowCardHeader>
                <MobileRowField
                  label="Período"
                  value={`${formatarData(contrato.dataInicio)} - ${formatarData(contrato.dataFim)}`}
                />
                <MobileRowField label="Valor" value={formatarMoeda(contrato.valorAluguel)} />
                <MobileRowActions>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/contratos/${contrato.id}`}>Detalhes</Link>
                  </Button>
                  {podeEditar && contrato.status === "ativo" && (
                    <>
                      {ehProprietario ? (
                        <Button variant="ghost" size="sm" onClick={() => abrirRenovacao(contrato)}>
                          Renovar
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="ghost" size="sm" disabled>
                                Renovar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Apenas o Proprietário pode alterar valores contratuais</TooltipContent>
                        </Tooltip>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setConfirmacao(contrato)}>
                        Encerrar
                      </Button>
                    </>
                  )}
                  {podeEditar && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setExcluindo(contrato)}>
                      Excluir
                    </Button>
                  )}
                </MobileRowActions>
              </MobileRowCard>
            ))}
          </div>
        </>
      )}

      {/* Novo contrato */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="gap-1 border-b p-4">
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Os pagamentos de aluguel (e caução, se informada) são gerados automaticamente para todo o período.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {usuario?.role === "administrador" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                Este contrato precisará de aprovação do Proprietário antes de ser ativado.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Imóvel (somente vagos)</Label>
                <Select value={form.imovelId} onValueChange={(v) => setForm({ ...form, imovelId: v })}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {imoveisVagos?.dados.map((imovel) => (
                      <SelectItem key={imovel.id} value={imovel.id}>
                        {imovel.logradouro}, {imovel.numero} - {imovel.bairro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Inquilino</Label>
                <Select value={form.inquilinoId} onValueChange={(v) => setForm({ ...form, inquilinoId: v })}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {inquilinosResultado?.dados
                      .filter((inquilino) => inquilino.usuario?.ativo)
                      .map((inquilino) => (
                        <SelectItem key={inquilino.id} value={inquilino.id}>
                          {inquilino.usuario?.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dataFim">Data de fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diaVencimento">Dia de vencimento</Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min={1}
                  max={31}
                  value={form.diaVencimento}
                  onChange={(e) => setForm({ ...form, diaVencimento: parseDiaVencimento(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="valorAluguel">Valor do aluguel</Label>
                <CurrencyInput
                  id="valorAluguel"
                  value={form.valorAluguel}
                  onValueChange={(v) => setForm({ ...form, valorAluguel: v ?? 0 })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valorCaucao">Caução (opcional)</Label>
              <CurrencyInput
                id="valorCaucao"
                value={form.valorCaucao}
                onValueChange={(v) => setForm({ ...form, valorCaucao: v })}
              />
            </div>
            {Boolean(form.valorCaucao) && (
              <div className="flex flex-col gap-1.5">
                <Label>Parcelar caução em</Label>
                <SeletorParcelasCaucao
                  valor={form.caucaoNumeroParcelas}
                  onChange={(v) => setForm({ ...form, caucaoNumeroParcelas: v })}
                />
                <PreviewParcelasCaucao
                  valorCaucao={form.valorCaucao}
                  numeroParcelas={form.caucaoNumeroParcelas ?? 1}
                  dataInicio={form.dataInicio}
                />
              </div>
            )}

            <div className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center gap-2 p-2.5 text-left text-sm font-medium"
                onClick={() => setMostrarUploadPdf((v) => !v)}
              >
                {mostrarUploadPdf ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Anexar PDF do contrato (opcional)
                {arquivoContrato && (
                  <span className="ml-auto truncate text-xs font-normal text-muted-foreground">
                    {arquivoContrato.name}
                  </span>
                )}
              </button>
              {mostrarUploadPdf && (
                <div className="flex flex-col gap-2 border-t p-2.5">
                  <input
                    ref={inputArquivoContratoRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={selecionarArquivoContrato}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => inputArquivoContratoRef.current?.click()}
                    >
                      {arquivoContrato ? "Trocar arquivo" : "Selecionar PDF"}
                    </Button>
                    {arquivoContrato && (
                      <span className="truncate text-sm text-muted-foreground">{arquivoContrato.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Você poderá adicionar depois, na tela de detalhes do contrato. Máx. 10MB.
                  </p>
                  {erroArquivo && <p className="text-xs text-destructive">{erroArquivo}</p>}
                </div>
              )}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter className="mx-0 mb-0">
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErro(null);
                mutCriar.mutate(form);
              }}
              disabled={salvando || !form.imovelId || !form.inquilinoId || !form.dataInicio || !form.dataFim}
            >
              {salvando ? "Criando..." : "Criar contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovacao */}
      <Dialog open={Boolean(contratoRenovando)} onOpenChange={(open) => !open && setContratoRenovando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Renovar Contrato</DialogTitle>
            <DialogDescription>
              Cria um novo contrato vinculado ao atual (que passa para o status "encerrado") e gera os novos
              pagamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Nova data de início</Label>
                <Input
                  type="date"
                  value={formRenovacao.dataInicio}
                  onChange={(e) => setFormRenovacao({ ...formRenovacao, dataInicio: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Nova data de fim</Label>
                <Input
                  type="date"
                  value={formRenovacao.dataFim}
                  onChange={(e) => setFormRenovacao({ ...formRenovacao, dataFim: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Dia de vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={formRenovacao.diaVencimento}
                  onChange={(e) => setFormRenovacao({ ...formRenovacao, diaVencimento: parseDiaVencimento(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Valor do aluguel</Label>
                <CurrencyInput
                  value={formRenovacao.valorAluguel}
                  onValueChange={(v) => setFormRenovacao({ ...formRenovacao, valorAluguel: v ?? 0 })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Caução (opcional)</Label>
              <CurrencyInput
                value={formRenovacao.valorCaucao}
                onValueChange={(v) => setFormRenovacao({ ...formRenovacao, valorCaucao: v })}
              />
            </div>
            {Boolean(formRenovacao.valorCaucao) && (
              <div className="flex flex-col gap-2">
                <Label>Parcelar caução em</Label>
                <SeletorParcelasCaucao
                  valor={formRenovacao.caucaoNumeroParcelas}
                  onChange={(v) => setFormRenovacao({ ...formRenovacao, caucaoNumeroParcelas: v })}
                />
                <PreviewParcelasCaucao
                  valorCaucao={formRenovacao.valorCaucao}
                  numeroParcelas={formRenovacao.caucaoNumeroParcelas ?? 1}
                  dataInicio={formRenovacao.dataInicio}
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={possuiAditivo} onCheckedChange={(v) => setPossuiAditivo(v === true)} />
              Esta renovação possui aditivo contratual
            </label>

            {possuiAditivo && (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="descricaoAditivoRenovacao">
                    Descrição das alterações <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="descricaoAditivoRenovacao"
                    rows={2}
                    value={formAditivoRenovacao.descricaoAlteracoes}
                    onChange={(e) =>
                      setFormAditivoRenovacao({ ...formAditivoRenovacao, descricaoAlteracoes: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label>Valor anterior</Label>
                    <CurrencyInput
                      value={formAditivoRenovacao.valorAnterior}
                      onValueChange={(v) => setFormAditivoRenovacao({ ...formAditivoRenovacao, valorAnterior: v })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Valor novo</Label>
                    <CurrencyInput
                      value={formAditivoRenovacao.valorNovo}
                      onValueChange={(v) => setFormAditivoRenovacao({ ...formAditivoRenovacao, valorNovo: v })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>
                    PDF do aditivo <span className="text-destructive">*</span>
                  </Label>
                  <input
                    ref={inputAditivoRenovacaoRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setArquivoAditivoRenovacao(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => inputAditivoRenovacaoRef.current?.click()}
                    >
                      {arquivoAditivoRenovacao ? "Trocar arquivo" : "Selecionar PDF"}
                    </Button>
                    {arquivoAditivoRenovacao && (
                      <span className="truncate text-sm text-muted-foreground">{arquivoAditivoRenovacao.name}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContratoRenovando(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErro(null);
                if (contratoRenovando) mutRenovar.mutate({ id: contratoRenovando.id, input: formRenovacao });
              }}
              disabled={
                mutRenovar.isPending ||
                !formRenovacao.dataInicio ||
                !formRenovacao.dataFim ||
                (possuiAditivo && (!formAditivoRenovacao.descricaoAlteracoes || !arquivoAditivoRenovacao))
              }
            >
              {mutRenovar.isPending ? "Renovando..." : "Renovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmacao)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmacao(null);
            setArquivoQuebra(null);
            setErroArquivoQuebra(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar contrato</DialogTitle>
            <DialogDescription>
              O contrato será marcado como encerrado e o imóvel volta a ficar vago.
            </DialogDescription>
          </DialogHeader>
          {confirmacao && new Date(confirmacao.dataFim) > new Date() && (
            <div className="rounded-lg border">
              <div className="flex items-center gap-2 p-2.5 text-sm font-medium">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                Anexar quebra de contrato (opcional)
              </div>
              <div className="flex flex-col gap-2 border-t p-2.5">
                <input
                  ref={inputArquivoQuebraRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={selecionarArquivoQuebra}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputArquivoQuebraRef.current?.click()}
                  >
                    {arquivoQuebra ? "Trocar arquivo" : "Selecionar PDF"}
                  </Button>
                  {arquivoQuebra && (
                    <span className="truncate text-sm text-muted-foreground">{arquivoQuebra.name}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Anexe o documento de quebra de contrato assinado, se houver. Máx. 10MB.
                </p>
                {erroArquivoQuebra && <p className="text-xs text-destructive">{erroArquivoQuebra}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={mutEncerrar.isPending}
              onClick={() => {
                if (!confirmacao) return;
                mutEncerrar.mutate({ id: confirmacao.id, arquivo: arquivoQuebra ?? undefined });
              }}
            >
              {mutEncerrar.isPending ? "Encerrando..." : "Encerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DoubleConfirmDialog
        open={Boolean(excluindo)}
        onOpenChange={(open) => !open && setExcluindo(null)}
        titulo="Excluir contrato definitivamente"
        descricao="Esta ação remove o contrato permanentemente. Só é possível se ele não tiver nenhum pagamento ou parcela de caução vinculado (na prática, apenas contratos pendentes de aprovação ou rejeitados)."
        confirmLabel={`Digite o ID do contrato (${excluindo?.id ?? ""}) para confirmar`}
        confirmValue={excluindo?.id ?? ""}
        textoConfirmar="Excluir definitivamente"
        pending={mutExcluir.isPending}
        onConfirm={() => excluindo && mutExcluir.mutate(excluindo.id)}
      />
    </div>
  );
}
