import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  listarPagamentosAdmin,
  criarPagamentoAdmin,
  marcarPagamentoAdminComoPago,
  type PagamentoAdminInput,
  type MarcarPagoAdminInput,
} from "@/api/pagamentosAdmin";
import { listarAdministradores } from "@/api/administradores";
import { FORMA_PAGAMENTO_ADMIN, type PagamentoAdministrador } from "@/types/domain";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CurrencyInput } from "@/components/currency-input";
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

const FORM_VAZIO: PagamentoAdminInput = { administradorId: "", mesReferencia: "", dataVencimento: "", observacoes: "" };

export function PagamentosAdminPage() {
  const [searchParams] = useSearchParams();
  const administradorIdFiltro = searchParams.get("administradorId") ?? undefined;
  const queryClient = useQueryClient();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<PagamentoAdminInput>({ ...FORM_VAZIO, administradorId: administradorIdFiltro ?? "" });
  const [erro, setErro] = useState<string | null>(null);

  const [pagando, setPagando] = useState<PagamentoAdministrador | null>(null);
  const [formPagar, setFormPagar] = useState<MarcarPagoAdminInput>({ valorPago: 0, formaPagamento: "pix" });

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["pagamentos-admin", administradorIdFiltro],
    queryFn: () => listarPagamentosAdmin(administradorIdFiltro),
  });

  const { data: administradores } = useQuery({ queryKey: ["administradores"], queryFn: listarAdministradores });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["pagamentos-admin"] });
  }

  const mutCriar = useMutation({
    mutationFn: (input: PagamentoAdminInput) => criarPagamentoAdmin(input),
    onSuccess: async () => {
      toast.success("Mensalidade cadastrada.");
      await invalidar();
      setDialogAberto(false);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutPagar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarcarPagoAdminInput }) => marcarPagamentoAdminComoPago(id, input),
    onSuccess: async () => {
      toast.success("Mensalidade paga registrada.");
      await invalidar();
      setPagando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  function abrirNovo() {
    setForm({ ...FORM_VAZIO, administradorId: administradorIdFiltro ?? "" });
    setErro(null);
    setDialogAberto(true);
  }

  function abrirPagar(pagamento: PagamentoAdministrador) {
    setPagando(pagamento);
    setFormPagar({ valorPago: 0, formaPagamento: "pix" });
    setErro(null);
  }

  const pagamentos = resultado?.dados ?? [];

  return (
    <div>
      <PageHeader
        titulo="Mensalidades de Administradores"
        descricao="Controle de pagamento dos administradores. Visível apenas para o proprietário."
        acoes={
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4" />
            Nova Mensalidade
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Administrador</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor pago</TableHead>
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
            {!isLoading && pagamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma mensalidade cadastrada.
                </TableCell>
              </TableRow>
            )}
            {pagamentos.map((pagamento) => (
              <TableRow key={pagamento.id}>
                <TableCell className="font-medium">{pagamento.administrador?.nome}</TableCell>
                <TableCell>{formatarCompetencia(pagamento.mesReferencia)}</TableCell>
                <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                <TableCell>{formatarMoeda(pagamento.valorPago)}</TableCell>
                <TableCell>
                  <StatusBadge status={pagamento.status} />
                </TableCell>
                <TableCell className="text-right">
                  {pagamento.status !== "pago" && (
                    <Button variant="outline" size="sm" onClick={() => abrirPagar(pagamento)}>
                      Marcar como pago
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Mensalidade</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Administrador</Label>
              <Select value={form.administradorId} onValueChange={(v) => setForm({ ...form, administradorId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o administrador" />
                </SelectTrigger>
                <SelectContent>
                  {administradores?.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mesReferencia">Mês de referência (AAAA-MM)</Label>
                <Input
                  id="mesReferencia"
                  placeholder="2026-08"
                  value={form.mesReferencia}
                  onChange={(e) => setForm({ ...form, mesReferencia: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="dataVencimento">Vencimento</Label>
                <Input
                  id="dataVencimento"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
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
              disabled={mutCriar.isPending || !form.administradorId || !form.mesReferencia || !form.dataVencimento}
            >
              {mutCriar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pagando)} onOpenChange={(open) => !open && setPagando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>{pagando && formatarCompetencia(pagando.mesReferencia)}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valorPagoAdmin">Valor pago</Label>
              <CurrencyInput
                id="valorPagoAdmin"
                value={formPagar.valorPago}
                onValueChange={(v) => setFormPagar({ ...formPagar, valorPago: v ?? 0 })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Forma de pagamento</Label>
              <Select
                value={formPagar.formaPagamento}
                onValueChange={(v) => setFormPagar({ ...formPagar, formaPagamento: v as MarcarPagoAdminInput["formaPagamento"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO_ADMIN.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {mutPagar.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
