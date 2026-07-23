import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, FileText } from "lucide-react";
import {
  listarContratos,
  criarContrato,
  encerrarContrato,
  rescindirContrato,
  renovarContrato,
  desativarContrato,
  reativarContrato,
  excluirContrato,
  enviarContratoAssinado,
  type ContratoInput,
  type RenovarContratoInput,
} from "@/api/contratos";
import { criarAditivo } from "@/api/aditivos";
import { listarImoveis } from "@/api/imoveis";
import { listarInquilinos } from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_CONTRATO, type Contrato } from "@/types/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { calcularParcelasCaucaoPreview } from "@/lib/caucao";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

// Um contrato tem 3 eixos independentes (status de ciclo de vida, aprovacao
// e visibilidade); a coluna "Status" da listagem precisa combinar os 3 numa
// unica badge, com a visibilidade (inativo) tendo prioridade sobre o resto.
function statusExibicaoContrato(contrato: Contrato): string {
  if (!contrato.ativo) return "inativo";
  if (contrato.statusAprovacao === "pendente_aprovacao") return "pendente_aprovacao";
  if (contrato.statusAprovacao === "rejeitado") return "rejeitado";
  return contrato.status;
}

export function ContratosPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarContratos;
  const queryClient = useQueryClient();

  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [ativoFiltro, setAtivoFiltro] = useState<"ativos" | "todos" | "inativos">("ativos");
  const [excluindo, setExcluindo] = useState<Contrato | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<ContratoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivoContrato, setArquivoContrato] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const inputArquivoContratoRef = useRef<HTMLInputElement>(null);

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

  const [confirmacao, setConfirmacao] = useState<{ contrato: Contrato; acao: "encerrar" | "rescindir" } | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["contratos", statusFiltro, ativoFiltro],
    queryFn: () =>
      listarContratos({
        status: statusFiltro === "todos" ? undefined : (statusFiltro as Contrato["status"]),
        ativoFiltro,
      }),
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
      if (contrato.statusAprovacao === "pendente_aprovacao") {
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
    mutationFn: (id: string) => encerrarContrato(id),
    onSuccess: async () => {
      toast.success("Contrato encerrado.");
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["imoveis"] });
      setConfirmacao(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRescindir = useMutation({
    mutationFn: (id: string) => rescindirContrato(id),
    onSuccess: async () => {
      toast.success("Contrato rescindido.");
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["imoveis"] });
      setConfirmacao(null);
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

  const mutDesativar = useMutation({
    mutationFn: (id: string) => desativarContrato(id),
    onSuccess: async () => {
      toast.success("Contrato desativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutReativar = useMutation({
    mutationFn: (id: string) => reativarContrato(id),
    onSuccess: async () => {
      toast.success("Contrato reativado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
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
  const contratos = resultado?.dados ?? [];

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

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-full max-w-xs">
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_CONTRATO.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Select value={ativoFiltro} onValueChange={(v) => setAtivoFiltro(v as typeof ativoFiltro)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativos">Mostrar apenas ativos</SelectItem>
              <SelectItem value="todos">Mostrar todos</SelectItem>
              <SelectItem value="inativos">Mostrar apenas inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                      <StatusBadge status={statusExibicaoContrato(contrato)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/contratos/${contrato.id}`}>Detalhes</Link>
                      </Button>
                      {podeEditar && contrato.status === "ativo" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => abrirRenovacao(contrato)}>
                            Renovar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmacao({ contrato, acao: "encerrar" })}
                          >
                            Encerrar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setConfirmacao({ contrato, acao: "rescindir" })}
                          >
                            Rescindir
                          </Button>
                        </>
                      )}
                      {podeEditar && (
                        <>
                          {contrato.ativo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 dark:text-amber-400"
                              onClick={() => mutDesativar.mutate(contrato.id)}
                            >
                              Desativar
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success"
                              onClick={() => mutReativar.mutate(contrato.id)}
                            >
                              Ativar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setExcluindo(contrato)}
                          >
                            Excluir
                          </Button>
                        </>
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
                  <StatusBadge status={statusExibicaoContrato(contrato)} />
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
                      <Button variant="ghost" size="sm" onClick={() => abrirRenovacao(contrato)}>
                        Renovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmacao({ contrato, acao: "encerrar" })}
                      >
                        Encerrar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setConfirmacao({ contrato, acao: "rescindir" })}
                      >
                        Rescindir
                      </Button>
                    </>
                  )}
                  {podeEditar && (
                    <>
                      {contrato.ativo ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 dark:text-amber-400"
                          onClick={() => mutDesativar.mutate(contrato.id)}
                        >
                          Desativar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-success"
                          onClick={() => mutReativar.mutate(contrato.id)}
                        >
                          Ativar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setExcluindo(contrato)}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </MobileRowActions>
              </MobileRowCard>
            ))}
          </div>
        </>
      )}

      {/* Novo contrato */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Os pagamentos de aluguel (e caução, se informada) são gerados automaticamente para todo o período.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {usuario?.role === "administrador" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                Este contrato precisará de aprovação do Proprietário antes de ser ativado.
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>Imóvel (somente vagos)</Label>
              <Select value={form.imovelId} onValueChange={(v) => setForm({ ...form, imovelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imóvel" />
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
            <div className="flex flex-col gap-2">
              <Label>Inquilino</Label>
              <Select value={form.inquilinoId} onValueChange={(v) => setForm({ ...form, inquilinoId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o inquilino" />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataFim">Data de fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="diaVencimento">Dia de vencimento</Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min={1}
                  max={28}
                  value={form.diaVencimento}
                  onChange={(e) => setForm({ ...form, diaVencimento: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valorAluguel">Valor do aluguel</Label>
                <CurrencyInput
                  id="valorAluguel"
                  value={form.valorAluguel}
                  onValueChange={(v) => setForm({ ...form, valorAluguel: v ?? 0 })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valorCaucao">Caução (opcional)</Label>
                <CurrencyInput
                  id="valorCaucao"
                  value={form.valorCaucao}
                  onValueChange={(v) => setForm({ ...form, valorCaucao: v })}
                />
              </div>
            </div>
            {Boolean(form.valorCaucao) && (
              <div className="flex flex-col gap-2">
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
            <div className="flex flex-col gap-2">
              <Label>Anexar PDF do Contrato</Label>
              <input
                ref={inputArquivoContratoRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={selecionarArquivoContrato}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => inputArquivoContratoRef.current?.click()}>
                  {arquivoContrato ? "Trocar arquivo" : "Selecionar PDF"}
                </Button>
                {arquivoContrato && <span className="truncate text-sm text-muted-foreground">{arquivoContrato.name}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Opcional — você poderá adicionar depois, na tela de detalhes do contrato. Máx. 10MB.
              </p>
              {erroArquivo && <p className="text-xs text-destructive">{erroArquivo}</p>}
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
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
              Cria um novo contrato vinculado ao atual (que passa para o status "renovado") e gera os novos
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
                  max={28}
                  value={formRenovacao.diaVencimento}
                  onChange={(e) => setFormRenovacao({ ...formRenovacao, diaVencimento: Number(e.target.value) })}
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

      <ConfirmDialog
        open={Boolean(confirmacao)}
        onOpenChange={(open) => !open && setConfirmacao(null)}
        titulo={confirmacao?.acao === "encerrar" ? "Encerrar contrato" : "Rescindir contrato"}
        descricao={
          confirmacao?.acao === "encerrar"
            ? "O contrato será marcado como encerrado e o imóvel volta a ficar vago."
            : "O contrato será marcado como rescindido e o imóvel volta a ficar vago."
        }
        textoConfirmar={confirmacao?.acao === "encerrar" ? "Encerrar" : "Rescindir"}
        destrutivo={confirmacao?.acao === "rescindir"}
        onConfirm={() => {
          if (!confirmacao) return;
          if (confirmacao.acao === "encerrar") mutEncerrar.mutate(confirmacao.contrato.id);
          else mutRescindir.mutate(confirmacao.contrato.id);
        }}
      />

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
