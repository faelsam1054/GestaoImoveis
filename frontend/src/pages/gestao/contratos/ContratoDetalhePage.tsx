import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Trash2, Download, Paperclip, FileStack, Pencil } from "lucide-react";
import {
  detalharContrato,
  enviarContratoAssinado,
  removerContratoAssinado,
  atualizarValoresContrato,
  type AtualizarValoresContratoInput,
} from "@/api/contratos";
import { listarParcelasCaucao, pagarParcelaCaucao, type PagarParcelaCaucaoInput } from "@/api/caucao";
import { listarAditivos, criarAditivo, excluirAditivo, baixarAditivo, type AditivoInput } from "@/api/aditivos";
import { useAuth } from "@/contexts/AuthContext";
import { FORMA_PAGAMENTO_CAUCAO, type CaucaoParcela, type AditivoContrato } from "@/types/domain";
import { formatarData, formatarMoeda, hojeInputData, paraInputData } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Estado local do campo permite "" (vazio) enquanto o usuario digita - ver
// mesma explicacao em ContratosPage.tsx: clampar a cada tecla impede digitar
// qualquer numero de 2 digitos. Validacao de intervalo so no submit.
type FormValoresContrato = Omit<AtualizarValoresContratoInput, "diaVencimento"> & { diaVencimento: number | "" };

interface FormAditivo {
  descricaoAlteracoes: string;
  dataAditivo: string;
  valorAluguelNovo: number;
  diaVencimentoNovo: number | "";
  dataFimNova: string;
  atualizarPagamentosFuturos: boolean;
  atualizarDataVencimentoPendentes: boolean;
}

function diaVencimentoInvalido(valor: number | ""): boolean {
  return valor === "" || valor < 1 || valor > 31;
}

export function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarContratos;
  const ehProprietario = usuario?.role === "proprietario";
  const queryClient = useQueryClient();
  const inputContratoRef = useRef<HTMLInputElement>(null);

  const [pagando, setPagando] = useState<CaucaoParcela | null>(null);
  const [formPagar, setFormPagar] = useState<PagarParcelaCaucaoInput>({
    formaPagamento: "pix",
    observacoes: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [removendoContrato, setRemovendoContrato] = useState(false);

  const [editandoValores, setEditandoValores] = useState(false);
  const [formValores, setFormValores] = useState<FormValoresContrato>({
    valorAluguel: 0,
    diaVencimento: 5,
    atualizarPagamentosFuturos: false,
    atualizarDataVencimentoPendentes: true,
  });
  const [erroValores, setErroValores] = useState<string | null>(null);

  const inputAditivoRef = useRef<HTMLInputElement>(null);
  const [aditivoDialogAberto, setAditivoDialogAberto] = useState(false);
  const [formAditivo, setFormAditivo] = useState<FormAditivo>({
    descricaoAlteracoes: "",
    dataAditivo: hojeInputData(),
    valorAluguelNovo: 0,
    diaVencimentoNovo: 5,
    dataFimNova: "",
    atualizarPagamentosFuturos: false,
    atualizarDataVencimentoPendentes: true,
  });
  const [arquivoAditivo, setArquivoAditivo] = useState<File | null>(null);
  const [erroAditivo, setErroAditivo] = useState<string | null>(null);
  const [excluindoAditivo, setExcluindoAditivo] = useState<AditivoContrato | null>(null);

  const { data: contrato, isLoading } = useQuery({
    queryKey: ["contratos", id],
    queryFn: () => detalharContrato(id!),
    enabled: Boolean(id),
  });

  const { data: parcelasCaucao } = useQuery({
    queryKey: ["contratos", id, "caucao"],
    queryFn: () => listarParcelasCaucao(id!),
    enabled: Boolean(id) && Boolean(contrato?.valorCaucao),
  });

  const mutPagar = useMutation({
    mutationFn: ({ parcelaId, input }: { parcelaId: string; input: PagarParcelaCaucaoInput }) =>
      pagarParcelaCaucao(id!, parcelaId, input),
    onSuccess: async () => {
      toast.success("Pagamento da parcela de caução registrado.");
      await queryClient.invalidateQueries({ queryKey: ["contratos", id, "caucao"] });
      setPagando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  function abrirPagar(parcela: CaucaoParcela) {
    setPagando(parcela);
    setFormPagar({ formaPagamento: "pix", observacoes: "" });
    setErro(null);
  }

  const mutEnviarContrato = useMutation({
    mutationFn: (arquivo: File) => enviarContratoAssinado(id!, arquivo),
    onSuccess: async () => {
      toast.success("Contrato assinado enviado.");
      await queryClient.invalidateQueries({ queryKey: ["contratos", id] });
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRemoverContrato = useMutation({
    mutationFn: () => removerContratoAssinado(id!),
    onSuccess: async () => {
      toast.success("Contrato assinado removido.");
      await queryClient.invalidateQueries({ queryKey: ["contratos", id] });
      setRemovendoContrato(false);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setRemovendoContrato(false);
    },
  });

  const mutAtualizarValores = useMutation({
    mutationFn: (input: AtualizarValoresContratoInput) => atualizarValoresContrato(id!, input),
    onSuccess: async (resultado) => {
      toast.success(
        resultado.pagamentosAtualizados > 0
          ? `Valores atualizados. ${resultado.pagamentosAtualizados} pagamento(s) foram atualizados.`
          : "Valores atualizados com sucesso.",
      );
      await queryClient.invalidateQueries({ queryKey: ["contratos", id] });
      setEditandoValores(false);
    },
    onError: (err) => setErroValores(mensagemErro(err)),
  });

  function abrirEditarValores() {
    if (!contrato) return;
    setFormValores({
      valorAluguel: contrato.valorAluguel,
      diaVencimento: contrato.diaVencimento,
      atualizarPagamentosFuturos: false,
      atualizarDataVencimentoPendentes: true,
    });
    setErroValores(null);
    setEditandoValores(true);
  }

  const { data: aditivos } = useQuery({
    queryKey: ["contratos", id, "aditivos"],
    queryFn: () => listarAditivos(id!),
    enabled: Boolean(id),
  });

  function invalidarAditivos() {
    return queryClient.invalidateQueries({ queryKey: ["contratos", id, "aditivos"] });
  }

  const mutCriarAditivo = useMutation({
    mutationFn: () => {
      const input: AditivoInput = {
        descricaoAlteracoes: formAditivo.descricaoAlteracoes,
        dataAditivo: formAditivo.dataAditivo,
        valorAluguelNovo: formAditivo.valorAluguelNovo,
        diaVencimentoNovo: Number(formAditivo.diaVencimentoNovo),
        dataFimNova: formAditivo.dataFimNova,
        atualizarPagamentosFuturos: formAditivo.atualizarPagamentosFuturos,
        atualizarDataVencimentoPendentes: formAditivo.atualizarDataVencimentoPendentes,
        arquivo: arquivoAditivo ?? undefined,
      };
      return criarAditivo(id!, input);
    },
    onSuccess: async () => {
      toast.success("Aditivo registrado e aplicado ao contrato.");
      await invalidarAditivos();
      await queryClient.invalidateQueries({ queryKey: ["contratos", id] });
      setAditivoDialogAberto(false);
    },
    onError: (err) => setErroAditivo(mensagemErro(err)),
  });

  const mutExcluirAditivo = useMutation({
    mutationFn: (aditivoId: string) => excluirAditivo(aditivoId),
    onSuccess: async () => {
      toast.success("Aditivo excluído.");
      await invalidarAditivos();
      setExcluindoAditivo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindoAditivo(null);
    },
  });

  async function baixar(aditivo: AditivoContrato) {
    try {
      await baixarAditivo(aditivo.id, `aditivo-${formatarData(aditivo.dataAditivo)}.pdf`);
    } catch (err) {
      toast.error(mensagemErro(err));
    }
  }

  function abrirNovoAditivo() {
    if (!contrato) return;
    setFormAditivo({
      descricaoAlteracoes: "",
      dataAditivo: hojeInputData(),
      valorAluguelNovo: contrato.valorAluguel,
      diaVencimentoNovo: contrato.diaVencimento,
      dataFimNova: paraInputData(contrato.dataFim),
      atualizarPagamentosFuturos: false,
      atualizarDataVencimentoPendentes: true,
    });
    setArquivoAditivo(null);
    setErroAditivo(null);
    setAditivoDialogAberto(true);
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!contrato) return <p className="text-muted-foreground">Contrato não encontrado.</p>;

  const parcelas = parcelasCaucao ?? [];
  const caucaoPaga = parcelas.filter((p) => p.status === "pago").reduce((soma, p) => soma + p.valorParcela, 0);
  const caucaoPendente = parcelas
    .filter((p) => p.status !== "pago")
    .reduce((soma, p) => soma + p.valorParcela, 0);
  const parcelasPagas = parcelas.filter((p) => p.status === "pago").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/contratos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Contratos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {contrato.imovel?.logradouro}, {contrato.imovel?.numero}
          </h2>
          <StatusBadge status={contrato.status} />
        </div>
        <p className="text-muted-foreground">
          Inquilino: {contrato.inquilino?.usuario?.nome} · {formatarData(contrato.dataInicio)} -{" "}
          {formatarData(contrato.dataFim)}
        </p>
      </div>

      <Tabs defaultValue="detalhes">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="aditivos">Aditivos{aditivos && aditivos.length > 0 ? ` (${aditivos.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Valores do Contrato</h3>
        {ehProprietario && (contrato.status === "ativo" || contrato.status === "encerrado") && (
          <Button variant="outline" size="sm" onClick={abrirEditarValores}>
            <Pencil className="h-4 w-4" />
            Editar Valores
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor do aluguel</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatarMoeda(contrato.valorAluguel)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Caução total</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {contrato.valorCaucao ? formatarMoeda(contrato.valorCaucao) : "Não informada"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dia de vencimento</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">Todo dia {contrato.diaVencimento}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contrato assinado (PDF)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {contrato.contratoAssinadoUrl
                ? "Documento enviado."
                : "Nenhum PDF do contrato assinado foi enviado ainda."}
            </p>
          </div>
          <div className="flex gap-2">
            {contrato.contratoAssinadoUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={contrato.contratoAssinadoUrl} target="_blank" rel="noreferrer">
                  Ver documento
                </a>
              </Button>
            )}
            {podeEditar && (
              <>
                <input
                  ref={inputContratoRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    if (arquivo) mutEnviarContrato.mutate(arquivo);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inputContratoRef.current?.click()}
                  disabled={mutEnviarContrato.isPending}
                >
                  <FileUp className="h-4 w-4" />
                  {contrato.contratoAssinadoUrl ? "Substituir" : "Enviar PDF"}
                </Button>
                {contrato.contratoAssinadoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setRemovendoContrato(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {contrato.quebraContratoUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Quebra de contrato (PDF)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href={contrato.quebraContratoUrl} target="_blank" rel="noreferrer">
                Baixar Quebra de Contrato
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {Boolean(contrato.valorCaucao) && (
        <Card>
          <CardHeader>
            <CardTitle>Caução</CardTitle>
            <p className="text-sm text-muted-foreground">
              {contrato.caucaoNumeroParcelas > 1
                ? `Parcelada em ${contrato.caucaoNumeroParcelas}x · ${parcelasPagas} de ${parcelas.length} pagas · Pago ${formatarMoeda(
                    caucaoPaga,
                  )} · Pendente ${formatarMoeda(caucaoPendente)}`
                : "Pagamento único (ver na lista de pagamentos abaixo)."}
            </p>
          </CardHeader>
          {contrato.caucaoNumeroParcelas > 1 && (
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell>
                        {parcela.numeroParcela} de {contrato.caucaoNumeroParcelas}
                      </TableCell>
                      <TableCell>{formatarMoeda(parcela.valorParcela)}</TableCell>
                      <TableCell>{formatarData(parcela.dataVencimento)}</TableCell>
                      <TableCell>{parcela.dataPagamento ? formatarData(parcela.dataPagamento) : "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={parcela.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {podeEditar && parcela.status !== "pago" && (
                          <Button variant="outline" size="sm" onClick={() => abrirPagar(parcela)}>
                            Registrar Pagamento
                          </Button>
                        )}
                        {parcela.reciboPdfUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={parcela.reciboPdfUrl} target="_blank" rel="noreferrer">
                              Recibo
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!contrato.pagamentos || contrato.pagamentos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum pagamento registrado.
                  </TableCell>
                </TableRow>
              )}
              {contrato.pagamentos?.map((pagamento) => (
                <TableRow key={pagamento.id}>
                  <TableCell>{pagamento.competencia}</TableCell>
                  <TableCell className="capitalize">{pagamento.tipo}</TableCell>
                  <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                  <TableCell>{formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}</TableCell>
                  <TableCell>
                    <StatusBadge status={pagamento.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="aditivos" className="flex flex-col gap-4">
          <div className="flex justify-end">
            {ehProprietario && (contrato.status === "ativo" || contrato.status === "encerrado") && (
              <Button size="sm" onClick={abrirNovoAditivo}>
                <Paperclip className="h-4 w-4" />
                Adicionar Aditivo
              </Button>
            )}
          </div>

          {(!aditivos || aditivos.length === 0) && (
            <EmptyState
              icon={FileStack}
              titulo="Nenhum aditivo cadastrado"
              descricao="Aditivos registram mudanças contratuais (ex: renovação com novo valor de aluguel)."
            />
          )}

          {aditivos && aditivos.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Data fim</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aditivos.map((aditivo) => (
                    <TableRow key={aditivo.id}>
                      <TableCell>{formatarData(aditivo.dataAditivo)}</TableCell>
                      <TableCell className="max-w-xs truncate">{aditivo.descricaoAlteracoes}</TableCell>
                      <TableCell>
                        {aditivo.valorAluguelAnterior !== null && aditivo.valorAluguelNovo !== null
                          ? `${formatarMoeda(aditivo.valorAluguelAnterior)} → ${formatarMoeda(aditivo.valorAluguelNovo)}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {aditivo.diaVencimentoAnterior !== null && aditivo.diaVencimentoNovo !== null
                          ? `dia ${aditivo.diaVencimentoAnterior} → dia ${aditivo.diaVencimentoNovo}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {aditivo.dataFimAnterior !== null && aditivo.dataFimNovo !== null
                          ? `${formatarData(aditivo.dataFimAnterior)} → ${formatarData(aditivo.dataFimNovo)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{aditivo.criadoPor?.nome ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {aditivo.arquivoPdfUrl && (
                          <Button variant="ghost" size="sm" onClick={() => baixar(aditivo)}>
                            <Download className="h-4 w-4" />
                            Baixar
                          </Button>
                        )}
                        {ehProprietario && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setExcluindoAditivo(aditivo)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Registrar pagamento de parcela de caucao */}
      <Dialog open={Boolean(pagando)} onOpenChange={(open) => !open && setPagando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento da parcela</DialogTitle>
            <DialogDescription>
              {pagando &&
                `Parcela ${pagando.numeroParcela} de ${contrato.caucaoNumeroParcelas} - ${formatarMoeda(pagando.valorParcela)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataPagamento">Data do pagamento</Label>
              <Input
                id="dataPagamento"
                type="date"
                value={formPagar.dataPagamento ?? ""}
                onChange={(e) => setFormPagar({ ...formPagar, dataPagamento: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={formPagar.formaPagamento}
                onValueChange={(v) =>
                  setFormPagar({ ...formPagar, formaPagamento: v as PagarParcelaCaucaoInput["formaPagamento"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO_CAUCAO.map((f) => (
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
                value={formPagar.observacoes ?? ""}
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
                if (pagando) mutPagar.mutate({ parcelaId: pagando.id, input: formPagar });
              }}
              disabled={mutPagar.isPending}
            >
              {mutPagar.isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar valores do contrato */}
      <Dialog open={editandoValores} onOpenChange={setEditandoValores}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Valores do Contrato</DialogTitle>
            <DialogDescription>Apenas o Proprietário pode alterar o valor do aluguel e o dia de vencimento.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valorAluguelEdit">Valor do aluguel</Label>
              <CurrencyInput
                id="valorAluguelEdit"
                value={formValores.valorAluguel}
                onValueChange={(v) => setFormValores({ ...formValores, valorAluguel: v ?? 0 })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="diaVencimentoEdit">
                Dia de vencimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="diaVencimentoEdit"
                type="number"
                min={1}
                max={31}
                placeholder="Dia do mês (1-31)"
                value={formValores.diaVencimento}
                onChange={(e) =>
                  setFormValores({ ...formValores, diaVencimento: e.target.value === "" ? "" : Number(e.target.value) })
                }
              />
              {diaVencimentoInvalido(formValores.diaVencimento) && (
                <p className="text-xs text-destructive">Informe um dia entre 1 e 31.</p>
              )}
            </div>
            {contrato.status === "encerrado" && (
              <p className="text-xs text-muted-foreground">
                Este contrato está encerrado - a alteração só corrige o cadastro, não afeta nenhum pagamento (todos os
                pendentes já foram cancelados ao encerrar).
              </p>
            )}
            {contrato.status === "ativo" &&
              formValores.diaVencimento !== "" &&
              formValores.diaVencimento !== contrato.diaVencimento && (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  <p>
                    Esta alteração atualizará a data de vencimento de todos os pagamentos pendentes (incluindo o mês
                    atual). Pagamentos já pagos não serão alterados.
                  </p>
                  <label className="flex items-start gap-2">
                    <Checkbox
                      checked={formValores.atualizarDataVencimentoPendentes}
                      onCheckedChange={(v) =>
                        setFormValores({ ...formValores, atualizarDataVencimentoPendentes: v === true })
                      }
                    />
                    <span>Atualizar pagamentos pendentes</span>
                  </label>
                </div>
              )}
            {contrato.status === "ativo" && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={formValores.atualizarPagamentosFuturos}
                  onCheckedChange={(v) =>
                    setFormValores({ ...formValores, atualizarPagamentosFuturos: v === true })
                  }
                />
                <span>
                  Aplicar o novo valor do aluguel aos pagamentos futuros já gerados (pendentes, a partir de hoje).
                  Pagamentos já pagos, atrasados ou cancelados não são alterados.
                </span>
              </label>
            )}
            {erroValores && <p className="text-sm text-destructive">{erroValores}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoValores(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErroValores(null);
                mutAtualizarValores.mutate({ ...formValores, diaVencimento: Number(formValores.diaVencimento) });
              }}
              disabled={
                mutAtualizarValores.isPending ||
                !formValores.valorAluguel ||
                formValores.valorAluguel <= 0 ||
                diaVencimentoInvalido(formValores.diaVencimento)
              }
            >
              {mutAtualizarValores.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removendoContrato}
        onOpenChange={setRemovendoContrato}
        titulo="Remover contrato assinado"
        descricao="O PDF enviado será removido. O contrato gerado automaticamente pelo sistema não é afetado."
        textoConfirmar="Remover"
        destrutivo
        onConfirm={() => mutRemoverContrato.mutate()}
      />

      {/* Adicionar aditivo */}
      <Dialog open={aditivoDialogAberto} onOpenChange={setAditivoDialogAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Aditivo</DialogTitle>
            <DialogDescription>
              Aplica as mudanças no mesmo contrato (não cria um novo) e mantém o histórico. PDF é opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricaoAlteracoes">
                Motivo do aditivo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="descricaoAlteracoes"
                rows={2}
                value={formAditivo.descricaoAlteracoes}
                onChange={(e) => setFormAditivo({ ...formAditivo, descricaoAlteracoes: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataEfetivacao">Data de efetivação</Label>
              <Input
                id="dataEfetivacao"
                type="date"
                value={formAditivo.dataAditivo}
                onChange={(e) => setFormAditivo({ ...formAditivo, dataAditivo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3">
              <span className="text-xs text-muted-foreground">Valor do aluguel</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatarMoeda(contrato.valorAluguel)} →</span>
                <CurrencyInput
                  value={formAditivo.valorAluguelNovo}
                  onValueChange={(v) => setFormAditivo({ ...formAditivo, valorAluguelNovo: v ?? 0 })}
                />
              </div>

              <span className="text-xs text-muted-foreground">Dia de vencimento</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">dia {contrato.diaVencimento} →</span>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Dia do mês (1-31)"
                  value={formAditivo.diaVencimentoNovo}
                  onChange={(e) =>
                    setFormAditivo({
                      ...formAditivo,
                      diaVencimentoNovo: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>

              <span className="text-xs text-muted-foreground">Data fim</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatarData(contrato.dataFim)} →</span>
                <Input
                  type="date"
                  value={formAditivo.dataFimNova}
                  onChange={(e) => setFormAditivo({ ...formAditivo, dataFimNova: e.target.value })}
                />
              </div>
            </div>
            {diaVencimentoInvalido(formAditivo.diaVencimentoNovo) && (
              <p className="text-xs text-destructive">Informe um dia de vencimento entre 1 e 31.</p>
            )}

            {contrato.status === "encerrado" && (
              <p className="text-xs text-muted-foreground">
                Este contrato está encerrado - a alteração só corrige o cadastro, não afeta nenhum pagamento (todos os
                pendentes já foram cancelados ao encerrar).
              </p>
            )}
            {contrato.status === "ativo" && formAditivo.diaVencimentoNovo !== contrato.diaVencimento && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <p>
                  Esta alteração atualizará a data de vencimento de todos os pagamentos pendentes (incluindo o mês
                  atual). Pagamentos já pagos não serão alterados.
                </p>
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={formAditivo.atualizarDataVencimentoPendentes}
                    onCheckedChange={(v) =>
                      setFormAditivo({ ...formAditivo, atualizarDataVencimentoPendentes: v === true })
                    }
                  />
                  <span>Atualizar pagamentos pendentes</span>
                </label>
              </div>
            )}
            {contrato.status === "ativo" && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={formAditivo.atualizarPagamentosFuturos}
                  onCheckedChange={(v) =>
                    setFormAditivo({ ...formAditivo, atualizarPagamentosFuturos: v === true })
                  }
                />
                <span>
                  Aplicar o novo valor do aluguel aos pagamentos futuros já gerados (pendentes, a partir de hoje).
                  Pagamentos já pagos, atrasados ou cancelados não são alterados.
                </span>
              </label>
            )}

            <div className="flex flex-col gap-2">
              <Label>PDF do aditivo (opcional)</Label>
              <input
                ref={inputAditivoRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setArquivoAditivo(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => inputAditivoRef.current?.click()}>
                  {arquivoAditivo ? "Trocar arquivo" : "Selecionar PDF"}
                </Button>
                {arquivoAditivo && (
                  <span className="truncate text-sm text-muted-foreground">{arquivoAditivo.name}</span>
                )}
              </div>
            </div>
            {erroAditivo && <p className="text-sm text-destructive">{erroAditivo}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAditivoDialogAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setErroAditivo(null);
                mutCriarAditivo.mutate();
              }}
              disabled={
                mutCriarAditivo.isPending ||
                !formAditivo.descricaoAlteracoes ||
                !formAditivo.dataFimNova ||
                !formAditivo.valorAluguelNovo ||
                formAditivo.valorAluguelNovo <= 0 ||
                diaVencimentoInvalido(formAditivo.diaVencimentoNovo)
              }
            >
              {mutCriarAditivo.isPending ? "Salvando..." : "Salvar Aditivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(excluindoAditivo)}
        onOpenChange={(open) => !open && setExcluindoAditivo(null)}
        titulo="Excluir aditivo"
        descricao="O PDF anexado será removido definitivamente. Esta ação não pode ser desfeita."
        textoConfirmar="Excluir"
        destrutivo
        onConfirm={() => excluindoAditivo && mutExcluirAditivo.mutate(excluindoAditivo.id)}
      />
    </div>
  );
}
