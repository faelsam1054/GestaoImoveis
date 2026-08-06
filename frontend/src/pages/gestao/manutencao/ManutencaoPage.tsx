import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Paperclip, Pencil, Trash2, Wrench, Eye, FileText, Download, RefreshCw } from "lucide-react";
import {
  listarManutencao,
  criarManutencao,
  atualizarManutencao,
  atualizarStatusManutencao,
  anexarComprovanteManutencao,
  removerComprovanteManutencao,
  excluirManutencao,
  baixarComprovanteManutencao,
  type GastoManutencaoInput,
  type AtualizarGastoManutencaoInput,
} from "@/api/manutencao";
import { listarImoveis } from "@/api/imoveis";
import { useAuth } from "@/contexts/AuthContext";
import {
  CATEGORIA_MANUTENCAO,
  STATUS_MANUTENCAO,
  FORMA_PAGAMENTO,
  RECORRENCIA_MANUTENCAO,
  type GastoManutencao,
  type FormaPagamento,
  type StatusManutencao,
  type RecorrenciaManutencao,
} from "@/types/domain";
import { formatarMoeda, formatarData, formatarDataHora, formatarTamanhoArquivo, paraInputData } from "@/lib/format";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface FormManutencao extends GastoManutencaoInput {
  status: StatusManutencao;
  dataPagamento: string;
  formaPagamento: FormaPagamento | "";
  recorrencia: RecorrenciaManutencao;
  dataFimRecorrencia: string;
}

const FORM_VAZIO: FormManutencao = {
  imovelId: "",
  descricao: "",
  categoria: "outros",
  valor: 0,
  dataExecucao: "",
  prestadorNome: "",
  prestadorDocumento: "",
  prestadorTelefone: "",
  observacoes: "",
  status: "orcamento",
  dataPagamento: "",
  formaPagamento: "",
  recorrencia: "unica",
  dataFimRecorrencia: "",
};

export function ManutencaoPage() {
  const { usuario } = useAuth();
  const ehProprietario = usuario?.role === "proprietario";
  const podeCadastrar = ehProprietario || usuario?.permissaoAdministrador?.podeCadastrarManutencao;
  const queryClient = useQueryClient();
  const inputComprovanteRef = useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [imovelIdFiltro, setImovelIdFiltro] = useState<string | undefined>(
    searchParams.get("imovelId") ?? undefined,
  );
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<GastoManutencao | null>(null);
  const [form, setForm] = useState<FormManutencao>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoLimparPagamento, setConfirmandoLimparPagamento] = useState(false);
  const [removendoComprovante, setRemovendoComprovante] = useState(false);
  const [excluindo, setExcluindo] = useState<GastoManutencao | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["manutencao", statusFiltro, imovelIdFiltro],
    queryFn: () =>
      listarManutencao({
        status: statusFiltro === "todos" ? undefined : (statusFiltro as GastoManutencao["status"]),
        imovelId: imovelIdFiltro,
      }),
  });

  function selecionarImovelFiltro(valor: string) {
    const novoImovelId = valor === "todos" ? undefined : valor;
    setImovelIdFiltro(novoImovelId);
    setSearchParams(
      (params) => {
        if (novoImovelId) params.set("imovelId", novoImovelId);
        else params.delete("imovelId");
        return params;
      },
      { replace: true },
    );
  }

  const { data: imoveisResultado } = useQuery({
    queryKey: ["imoveis", "todos-para-manutencao"],
    queryFn: () => listarImoveis({}),
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["manutencao"] });
  }

  function fecharDialog() {
    setDialogAberto(false);
    setEditando(null);
  }

  const mutCriar = useMutation({
    mutationFn: (input: GastoManutencaoInput) => criarManutencao(input),
    onSuccess: async () => {
      toast.success("Gasto de manutenção cadastrado.");
      await invalidar();
      fecharDialog();
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AtualizarGastoManutencaoInput }) =>
      atualizarManutencao(id, input),
    onSuccess: async () => {
      toast.success("Manutenção atualizada com sucesso.");
      await invalidar();
      setConfirmandoLimparPagamento(false);
      fecharDialog();
    },
    onError: (err) => {
      setErro(mensagemErro(err));
      setConfirmandoLimparPagamento(false);
    },
  });

  const mutStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: GastoManutencao["status"] }) =>
      atualizarStatusManutencao(id, status),
    onSuccess: async () => {
      toast.success("Status atualizado.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutComprovante = useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => anexarComprovanteManutencao(id, arquivo),
    onSuccess: async (gasto) => {
      toast.success("Comprovante anexado.");
      await invalidar();
      setEditando(gasto);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRemoverComprovante = useMutation({
    mutationFn: (id: string) => removerComprovanteManutencao(id),
    onSuccess: async (gasto) => {
      toast.success("Comprovante removido.");
      await invalidar();
      setEditando(gasto);
      setRemovendoComprovante(false);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setRemovendoComprovante(false);
    },
  });

  const mutExcluir = useMutation({
    mutationFn: (id: string) => excluirManutencao(id),
    onSuccess: async () => {
      toast.success("Manutenção excluída com sucesso.");
      await invalidar();
      setExcluindo(null);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setExcluindo(null);
    },
  });

  function abrirNovo() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(gasto: GastoManutencao) {
    setEditando(gasto);
    setForm({
      imovelId: gasto.imovelId,
      descricao: gasto.descricao,
      categoria: gasto.categoria,
      valor: gasto.valor,
      dataExecucao: paraInputData(gasto.dataExecucao),
      prestadorNome: gasto.prestadorNome ?? "",
      prestadorDocumento: gasto.prestadorDocumento ?? "",
      prestadorTelefone: gasto.prestadorTelefone ?? "",
      observacoes: gasto.observacoes ?? "",
      status: gasto.status,
      dataPagamento: paraInputData(gasto.dataPagamento),
      formaPagamento: gasto.formaPagamento ?? "",
      recorrencia: gasto.recorrencia,
      dataFimRecorrencia: paraInputData(gasto.dataFimRecorrencia),
    });
    setErro(null);
    setDialogAberto(true);
  }

  function proximoStatus(atual: GastoManutencao["status"]): GastoManutencao["status"] | null {
    const ordem = STATUS_MANUTENCAO;
    const idx = ordem.indexOf(atual);
    return idx < ordem.length - 1 ? ordem[idx + 1] : null;
  }

  async function baixarComprovante(gasto: GastoManutencao) {
    try {
      await baixarComprovanteManutencao(gasto.id, gasto.comprovanteNomeOriginal ?? "comprovante.pdf");
    } catch (err) {
      toast.error(mensagemErro(err));
    }
  }

  function montarInputEdicao(): AtualizarGastoManutencaoInput {
    return {
      imovelId: form.imovelId,
      descricao: form.descricao,
      categoria: form.categoria,
      valor: form.valor,
      dataExecucao: form.dataExecucao || undefined,
      prestadorNome: form.prestadorNome || undefined,
      prestadorDocumento: form.prestadorDocumento || undefined,
      prestadorTelefone: form.prestadorTelefone || undefined,
      observacoes: form.observacoes || undefined,
      status: form.status,
      dataPagamento: form.dataPagamento || undefined,
      formaPagamento: (form.formaPagamento || undefined) as FormaPagamento | undefined,
      recorrencia: form.recorrencia,
      dataFimRecorrencia: form.recorrencia === "unica" ? null : form.dataFimRecorrencia || undefined,
    };
  }

  const valorInvalido = form.valor <= 0;
  const dataPagamentoAntesDaExecucao = Boolean(
    form.dataPagamento && form.dataExecucao && form.dataPagamento < form.dataExecucao,
  );
  const pagoIncompleto = form.status === "pago" && (!form.dataPagamento || !form.formaPagamento);

  function montarInputCriacao(): GastoManutencaoInput {
    return {
      ...form,
      dataFimRecorrencia: form.recorrencia === "unica" ? undefined : form.dataFimRecorrencia || undefined,
    };
  }

  function submeter() {
    setErro(null);
    if (!editando) {
      mutCriar.mutate(montarInputCriacao());
      return;
    }
    const saindoDePago = editando.status === "pago" && form.status !== "pago";
    if (saindoDePago) {
      setConfirmandoLimparPagamento(true);
      return;
    }
    mutAtualizar.mutate({ id: editando.id, input: montarInputEdicao() });
  }

  const salvando = mutCriar.isPending || mutAtualizar.isPending;
  const submitBloqueado =
    !form.imovelId || !form.descricao || valorInvalido || dataPagamentoAntesDaExecucao || pagoIncompleto;

  const gastos = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Manutenção"
        descricao="Orçamentos e execuções de manutenção nos imóveis."
        acoes={
          podeCadastrar ? (
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" />
              Novo Gasto
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
              {STATUS_MANUTENCAO.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Select value={imovelIdFiltro ?? "todos"} onValueChange={selecionarImovelFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Imóvel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os imóveis</SelectItem>
              {imoveisResultado?.dados.map((imovel) => (
                <SelectItem key={imovel.id} value={imovel.id}>
                  {imovel.logradouro}, {imovel.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <input
        ref={inputComprovanteRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo && editando) mutComprovante.mutate({ id: editando.id, arquivo });
          e.target.value = "";
        }}
      />

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && gastos.length === 0 && (
        <EmptyState
          icon={Wrench}
          titulo="Nenhum gasto de manutenção encontrado"
          descricao="Ajuste os filtros ou cadastre um novo gasto para começar."
        />
      )}

      {!isLoading && gastos.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data de execução</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Comprovante</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastos.map((gasto) => {
                  const proximo = proximoStatus(gasto.status);
                  return (
                    <TableRow key={gasto.id}>
                      <TableCell>
                        {gasto.imovel?.logradouro}, {gasto.imovel?.numero}
                      </TableCell>
                      <TableCell>{gasto.descricao}</TableCell>
                      <TableCell className="capitalize">{gasto.categoria}</TableCell>
                      <TableCell>{formatarData(gasto.dataExecucao)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {gasto.origem === "chamado_inquilino" ? "Chamado do inquilino" : "Proprietário"}
                      </TableCell>
                      <TableCell>{formatarMoeda(gasto.valor)}</TableCell>
                      <TableCell>
                        <StatusBadge status={gasto.status} />
                      </TableCell>
                      <TableCell>
                        {gasto.recorrencia !== "unica" ? (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                            <StatusBadge status={gasto.recorrencia} />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {gasto.comprovantePdfUrl ? (
                          <div className="flex items-center gap-1">
                            <Link to={`/manutencao/${gasto.id}`} title="Ver comprovante">
                              <FileText className="h-5 w-5 text-destructive" />
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => baixarComprovante(gasto)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {podeCadastrar && proximo && (proximo !== "aprovado" || ehProprietario) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => mutStatus.mutate({ id: gasto.id, status: proximo })}
                            disabled={mutStatus.isPending}
                          >
                            Marcar {proximo}
                          </Button>
                        )}
                        {podeCadastrar && proximo === "aprovado" && !ehProprietario && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="outline" size="sm" disabled>
                                  Marcar aprovado
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Apenas o Proprietário pode aprovar manutenção</TooltipContent>
                          </Tooltip>
                        )}
                        <Button variant="ghost" size="icon" className="text-muted-foreground" asChild>
                          <Link to={`/manutencao/${gasto.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {podeCadastrar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            onClick={() => abrirEdicao(gasto)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {podeCadastrar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setExcluindo(gasto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {gastos.map((gasto) => {
              const proximo = proximoStatus(gasto.status);
              return (
                <MobileRowCard key={gasto.id}>
                  <MobileRowCardHeader>
                    <div className="min-w-0">
                      <p className="font-medium">{gasto.descricao}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {gasto.imovel?.logradouro}, {gasto.imovel?.numero}
                      </p>
                    </div>
                    <StatusBadge status={gasto.status} />
                  </MobileRowCardHeader>
                  <MobileRowField label="Categoria" value={<span className="capitalize">{gasto.categoria}</span>} />
                  <MobileRowField label="Data de execução" value={formatarData(gasto.dataExecucao)} />
                  <MobileRowField
                    label="Origem"
                    value={gasto.origem === "chamado_inquilino" ? "Chamado do inquilino" : "Proprietário"}
                  />
                  <MobileRowField label="Valor" value={formatarMoeda(gasto.valor)} />
                  <MobileRowField
                    label="Recorrência"
                    value={
                      gasto.recorrencia !== "unica" ? (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                          <StatusBadge status={gasto.recorrencia} />
                        </div>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <MobileRowField
                    label="Comprovante"
                    value={
                      gasto.comprovantePdfUrl ? (
                        <div className="flex items-center gap-1">
                          <Link to={`/manutencao/${gasto.id}`}>
                            <FileText className="h-5 w-5 text-destructive" />
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => baixarComprovante(gasto)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <MobileRowActions>
                    {podeCadastrar && proximo && (proximo !== "aprovado" || ehProprietario) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mutStatus.mutate({ id: gasto.id, status: proximo })}
                        disabled={mutStatus.isPending}
                      >
                        Marcar {proximo}
                      </Button>
                    )}
                    {podeCadastrar && proximo === "aprovado" && !ehProprietario && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button variant="outline" size="sm" disabled>
                              Marcar aprovado
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Apenas o Proprietário pode aprovar manutenção</TooltipContent>
                      </Tooltip>
                    )}
                    <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                      <Link to={`/manutencao/${gasto.id}`}>
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Link>
                    </Button>
                    {podeCadastrar && (
                      <Button variant="ghost" size="sm" className="text-primary" onClick={() => abrirEdicao(gasto)}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    )}
                    {podeCadastrar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setExcluindo(gasto)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    )}
                  </MobileRowActions>
                </MobileRowCard>
              );
            })}
          </div>
        </>
      )}

      <Dialog open={dialogAberto} onOpenChange={(open) => !open && fecharDialog()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Manutenção" : "Novo Gasto de Manutenção"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Corrija os dados deste gasto de manutenção."
                : "Registre um orçamento de manutenção para um imóvel."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                Imóvel <span className="text-destructive">*</span>
              </Label>
              <Select value={form.imovelId} onValueChange={(v) => setForm({ ...form, imovelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o imóvel" />
                </SelectTrigger>
                <SelectContent>
                  {imoveisResultado?.dados.map((imovel) => (
                    <SelectItem key={imovel.id} value={imovel.id}>
                      {imovel.logradouro}, {imovel.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v as GastoManutencaoInput["categoria"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_MANUTENCAO.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valor">
                  Valor <span className="text-destructive">*</span>
                </Label>
                <CurrencyInput
                  id="valor"
                  value={form.valor}
                  onValueChange={(v) => setForm({ ...form, valor: v ?? 0 })}
                />
                {valorInvalido && <p className="text-xs text-destructive">O valor deve ser positivo.</p>}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dataExecucao">Data de execução</Label>
              <Input
                id="dataExecucao"
                type="date"
                value={form.dataExecucao}
                onChange={(e) => setForm({ ...form, dataExecucao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="prestadorNome">Prestador de serviço</Label>
                <Input
                  id="prestadorNome"
                  value={form.prestadorNome}
                  onChange={(e) => setForm({ ...form, prestadorNome: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="prestadorDocumento">CPF/CNPJ</Label>
                <Input
                  id="prestadorDocumento"
                  value={form.prestadorDocumento}
                  onChange={(e) => setForm({ ...form, prestadorDocumento: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="prestadorTelefone">Telefone</Label>
                <Input
                  id="prestadorTelefone"
                  value={form.prestadorTelefone}
                  onChange={(e) => setForm({ ...form, prestadorTelefone: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <Label>Recorrência</Label>
              <p className="text-xs text-muted-foreground">
                Para despesas mensais como limpeza, jardinagem, etc.
              </p>
              <RadioGroup
                value={form.recorrencia}
                onValueChange={(v) => setForm({ ...form, recorrencia: v as RecorrenciaManutencao })}
                className="flex flex-wrap gap-x-5 gap-y-2"
              >
                {RECORRENCIA_MANUTENCAO.map((r) => (
                  <label key={r} className="flex shrink-0 items-center gap-2 text-sm capitalize">
                    <RadioGroupItem value={r} />
                    {r === "unica" ? "Única" : r}
                  </label>
                ))}
              </RadioGroup>
              {form.recorrencia !== "unica" && (
                <div className="flex flex-col gap-2 pt-2">
                  <Label htmlFor="dataFimRecorrencia">Repetir até (opcional)</Label>
                  <Input
                    id="dataFimRecorrencia"
                    type="date"
                    value={form.dataFimRecorrencia}
                    onChange={(e) => setForm({ ...form, dataFimRecorrencia: e.target.value })}
                  />
                </div>
              )}
            </div>

            {editando && (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as StatusManutencao })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_MANUTENCAO.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="capitalize"
                          disabled={s === "aprovado" && !ehProprietario && editando?.status !== "aprovado"}
                        >
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!ehProprietario && editando?.status !== "aprovado" && (
                    <p className="text-xs text-muted-foreground">Apenas o Proprietário pode aprovar manutenção.</p>
                  )}
                </div>

                {form.status === "pago" && (
                  <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="dataPagamento">
                        Data de pagamento <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="dataPagamento"
                        type="date"
                        value={form.dataPagamento}
                        onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>
                        Forma de pagamento <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.formaPagamento}
                        onValueChange={(v) => setForm({ ...form, formaPagamento: v as FormaPagamento })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                    {dataPagamentoAntesDaExecucao && (
                      <p className="col-span-2 text-xs text-destructive">
                        A data de pagamento não pode ser anterior à data de execução.
                      </p>
                    )}
                    {pagoIncompleto && (
                      <p className="col-span-2 text-xs text-destructive">
                        Informe data e forma de pagamento para marcar como pago.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 rounded-lg border p-3">
                  <Label>Comprovante</Label>
                  {editando.comprovantePdfUrl ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{editando.comprovanteNomeOriginal ?? "Comprovante"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatarTamanhoArquivo(editando.comprovanteTamanho)} · enviado em{" "}
                          {formatarDataHora(editando.comprovanteUploadEm)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => inputComprovanteRef.current?.click()}
                          disabled={mutComprovante.isPending}
                        >
                          {mutComprovante.isPending ? "Enviando..." : "Substituir"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setRemovendoComprovante(true)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => inputComprovanteRef.current?.click()}
                      disabled={mutComprovante.isPending}
                    >
                      <Paperclip className="h-4 w-4" />
                      {mutComprovante.isPending ? "Enviando..." : "Anexar comprovante"}
                    </Button>
                  )}
                </div>
              </>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialog}>
              Cancelar
            </Button>
            <Button onClick={submeter} disabled={salvando || submitBloqueado}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmandoLimparPagamento}
        onOpenChange={setConfirmandoLimparPagamento}
        titulo="Limpar dados de pagamento?"
        descricao="Este gasto está marcado como pago. Ao mudar o status, a data de pagamento e a forma de pagamento registradas serão apagadas."
        textoConfirmar="Continuar"
        destrutivo
        onConfirm={() => editando && mutAtualizar.mutate({ id: editando.id, input: montarInputEdicao() })}
      />

      <ConfirmDialog
        open={removendoComprovante}
        onOpenChange={setRemovendoComprovante}
        titulo="Remover comprovante"
        descricao="O arquivo do comprovante será removido definitivamente do sistema."
        textoConfirmar="Remover"
        destrutivo
        onConfirm={() => editando && mutRemoverComprovante.mutate(editando.id)}
      />

      <DoubleConfirmDialog
        open={Boolean(excluindo)}
        onOpenChange={(open) => !open && setExcluindo(null)}
        titulo="Excluir Manutenção"
        descricao={
          excluindo ? (
            <>
              Esta ação não pode ser desfeita. A manutenção <strong>{excluindo.descricao}</strong> do imóvel{" "}
              <strong>
                {excluindo.imovel?.logradouro}, {excluindo.imovel?.numero}
              </strong>{" "}
              no valor de <strong>{formatarMoeda(excluindo.valor)}</strong> será removida.
              {excluindo.comprovantePdfUrl && " O comprovante anexado também será removido."}
            </>
          ) : (
            ""
          )
        }
        somenteCheckbox
        textoConfirmar="Excluir Definitivamente"
        pending={mutExcluir.isPending}
        onConfirm={() => excluindo && mutExcluir.mutate(excluindo.id)}
      />
    </div>
  );
}
