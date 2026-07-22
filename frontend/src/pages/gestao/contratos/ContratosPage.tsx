import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  listarContratos,
  criarContrato,
  encerrarContrato,
  rescindirContrato,
  renovarContrato,
  detalharContrato,
  type ContratoInput,
  type RenovarContratoInput,
} from "@/api/contratos";
import { listarImoveis } from "@/api/imoveis";
import { listarInquilinos } from "@/api/inquilinos";
import { useAuth } from "@/contexts/AuthContext";
import { STATUS_CONTRATO, type Contrato } from "@/types/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

export function ContratosPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarContratos;
  const queryClient = useQueryClient();

  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<ContratoInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const [contratoRenovando, setContratoRenovando] = useState<Contrato | null>(null);
  const [formRenovacao, setFormRenovacao] = useState<RenovarContratoInput>({
    dataInicio: "",
    dataFim: "",
    diaVencimento: 5,
    valorAluguel: 0,
    valorCaucao: undefined,
  });

  const [confirmacao, setConfirmacao] = useState<{ contrato: Contrato; acao: "encerrar" | "rescindir" } | null>(null);
  const [verPagamentosId, setVerPagamentosId] = useState<string | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["contratos", statusFiltro],
    queryFn: () => listarContratos({ status: statusFiltro === "todos" ? undefined : (statusFiltro as Contrato["status"]) }),
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

  const { data: contratoDetalhe } = useQuery({
    queryKey: ["contratos", verPagamentosId],
    queryFn: () => detalharContrato(verPagamentosId!),
    enabled: Boolean(verPagamentosId),
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["contratos"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: ContratoInput) => criarContrato(input),
    onSuccess: async () => {
      toast.success("Contrato criado. Pagamentos gerados automaticamente.");
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["imoveis"] });
      setDialogAberto(false);
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
    onSuccess: async () => {
      toast.success("Contrato renovado.");
      await invalidar();
      setContratoRenovando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirRenovacao(contrato: Contrato) {
    setContratoRenovando(contrato);
    setFormRenovacao({
      dataInicio: "",
      dataFim: "",
      diaVencimento: contrato.diaVencimento,
      valorAluguel: contrato.valorAluguel,
      valorCaucao: contrato.valorCaucao ?? undefined,
    });
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

      <div className="mb-4 max-w-xs">
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

      <div className="rounded-lg border bg-background">
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
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && contratos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum contrato encontrado.
                </TableCell>
              </TableRow>
            )}
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
                  <Button variant="ghost" size="sm" onClick={() => setVerPagamentosId(contrato.id)}>
                    Pagamentos
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
                  {inquilinosResultado?.dados.map((inquilino) => (
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
                <Input
                  id="valorAluguel"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valorAluguel}
                  onChange={(e) => setForm({ ...form, valorAluguel: Number(e.target.value) })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="valorCaucao">Caução (opcional)</Label>
                <Input
                  id="valorCaucao"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valorCaucao ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, valorCaucao: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
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
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formRenovacao.valorAluguel}
                  onChange={(e) => setFormRenovacao({ ...formRenovacao, valorAluguel: Number(e.target.value) })}
                />
              </div>
            </div>
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
              disabled={mutRenovar.isPending || !formRenovacao.dataInicio || !formRenovacao.dataFim}
            >
              {mutRenovar.isPending ? "Renovando..." : "Renovar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ver pagamentos do contrato */}
      <Dialog open={Boolean(verPagamentosId)} onOpenChange={(open) => !open && setVerPagamentosId(null)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagamentos do contrato</DialogTitle>
          </DialogHeader>
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
              {contratoDetalhe?.pagamentos?.map((pagamento) => (
                <TableRow key={pagamento.id}>
                  <TableCell>{pagamento.competencia}</TableCell>
                  <TableCell className="capitalize">{pagamento.tipo}</TableCell>
                  <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                  <TableCell>{formatarMoeda(pagamento.valorPrevisto)}</TableCell>
                  <TableCell>
                    <StatusBadge status={pagamento.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    </div>
  );
}
