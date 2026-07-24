import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Undo2, Wallet } from "lucide-react";
import {
  listarPagamentosAdmin,
  calcularPagamentoAdmin,
  marcarPagamentoAdminComoPago,
  desfazerPagamentoAdmin,
  type MarcarPagoAdminInput,
} from "@/api/pagamentosAdmin";
import { listarAdministradores } from "@/api/administradores";
import { FORMA_PAGAMENTO_ADMIN, type PagamentoAdministrador } from "@/types/domain";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CurrencyInput } from "@/components/currency-input";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function mesReferenciaAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

const mesAtual = mesReferenciaAtual();

export function PagamentosAdminPage() {
  const [searchParams] = useSearchParams();
  const administradorIdFiltro = searchParams.get("administradorId") ?? undefined;
  const queryClient = useQueryClient();

  const [pagando, setPagando] = useState<PagamentoAdministrador | null>(null);
  const [formPagar, setFormPagar] = useState<MarcarPagoAdminInput>({ valorPago: 0, formaPagamento: "pix" });
  const [erro, setErro] = useState<string | null>(null);
  const [desfazendo, setDesfazendo] = useState<PagamentoAdministrador | null>(null);

  const { data: resultado, isLoading } = useQuery({
    queryKey: ["pagamentos-admin", administradorIdFiltro],
    queryFn: () => listarPagamentosAdmin(administradorIdFiltro),
  });

  const { data: administradores } = useQuery({ queryKey: ["administradores"], queryFn: listarAdministradores });

  // Calculo do mes atual: so faz sentido com um administrador especifico
  // selecionado (a tela e sempre acessada a partir do link "Mensalidades" de
  // um administrador; sem filtro nao ha um unico calculo para mostrar aqui).
  const { data: calculoMesAtual, isLoading: carregandoCalculo } = useQuery({
    queryKey: ["pagamentos-admin", "calcular", administradorIdFiltro, mesAtual],
    queryFn: () => calcularPagamentoAdmin(administradorIdFiltro!, mesAtual),
    enabled: Boolean(administradorIdFiltro),
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["pagamentos-admin"] });
  }

  const mutPagar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarcarPagoAdminInput }) => marcarPagamentoAdminComoPago(id, input),
    onSuccess: async () => {
      toast.success("Mensalidade paga registrada.");
      await invalidar();
      setPagando(null);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const mutDesfazer = useMutation({
    mutationFn: (id: string) => desfazerPagamentoAdmin(id),
    onSuccess: async () => {
      toast.success("Pagamento desfeito com sucesso");
      await invalidar();
      setDesfazendo(null);
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  function abrirPagar(pagamento: PagamentoAdministrador) {
    setPagando(pagamento);
    setFormPagar({ valorPago: pagamento.valorPrevisto, formaPagamento: "pix" });
    setErro(null);
  }

  const pagamentos = resultado?.dados ?? [];
  const administradorNome = administradores?.find((a) => a.id === administradorIdFiltro)?.nome;

  return (
    <div>
      <PageHeader
        titulo="Mensalidades de Administradores"
        descricao="Calculada automaticamente: 10% da soma dos aluguéis dos imóveis do administrador, gerada quando todos os inquilinos pagam o mês. Visível apenas para o proprietário."
      />

      {administradorIdFiltro && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">
              Mês atual ({formatarCompetencia(mesAtual)}){administradorNome ? ` — ${administradorNome}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {carregandoCalculo && <p className="text-sm text-muted-foreground">Calculando...</p>}
            {!carregandoCalculo && calculoMesAtual && (
              <div className="flex flex-col gap-3">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Imóveis responsáveis</p>
                    <p className="font-medium">{calculoMesAtual.existente ? calculoMesAtual.registro.quantidadeImoveis : calculoMesAtual.quantidadeImoveis}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total dos aluguéis</p>
                    <p className="font-medium">
                      {formatarMoeda(calculoMesAtual.existente ? calculoMesAtual.registro.valorTotalAlugueis : calculoMesAtual.valorTotalAlugueis)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Percentual</p>
                    <p className="font-medium">
                      {calculoMesAtual.existente ? calculoMesAtual.registro.percentual : calculoMesAtual.percentual}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mensalidade</p>
                    <p className="font-medium">
                      {formatarMoeda(calculoMesAtual.existente ? calculoMesAtual.registro.valorPrevisto : calculoMesAtual.valorPrevisto)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={calculoMesAtual.status} />
                  {calculoMesAtual.existente && calculoMesAtual.status !== "pago" && (
                    <Button size="sm" onClick={() => abrirPagar(calculoMesAtual.registro)}>
                      Marcar como pago
                    </Button>
                  )}
                  {calculoMesAtual.existente && calculoMesAtual.status === "pago" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-amber-600 dark:text-amber-400"
                      onClick={() => setDesfazendo(calculoMesAtual.registro)}
                    >
                      <Undo2 className="h-4 w-4" />
                      Desfazer Pagamento
                    </Button>
                  )}
                </div>

                {!calculoMesAtual.existente && calculoMesAtual.status === "sem_imoveis" && (
                  <p className="text-sm text-muted-foreground">
                    Este administrador não tem imóveis com contrato ativo este mês.
                  </p>
                )}

                {!calculoMesAtual.existente && calculoMesAtual.inquilinosPendentes.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">
                      Aguardando o pagamento de {calculoMesAtual.inquilinosPendentes.length} inquilino(s):
                    </p>
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {calculoMesAtual.inquilinosPendentes.map((p) => (
                        <li key={p.imovelId} className="flex items-center justify-between">
                          <span>
                            {p.inquilinoNome} — {p.imovelEndereco}
                          </span>
                          <StatusBadge status={p.statusPagamento} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Desktop/tablet: tabela */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Administrador</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Mensalidade</TableHead>
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
                    Nenhuma mensalidade gerada ainda.
                  </TableCell>
                </TableRow>
              )}
              {pagamentos.map((pagamento) => (
                <TableRow key={pagamento.id}>
                  <TableCell className="font-medium">
                    {pagamento.administrador?.nome}
                    <p className="text-xs font-normal text-muted-foreground">
                      {pagamento.quantidadeImoveis} imóve{pagamento.quantidadeImoveis === 1 ? "l" : "is"} · base{" "}
                      {formatarMoeda(pagamento.valorTotalAlugueis)} · {pagamento.percentual}%
                    </p>
                  </TableCell>
                  <TableCell>{formatarCompetencia(pagamento.mesReferencia)}</TableCell>
                  <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                  <TableCell>{formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}</TableCell>
                  <TableCell>
                    <StatusBadge status={pagamento.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {pagamento.status !== "pago" && (
                      <Button variant="outline" size="sm" onClick={() => abrirPagar(pagamento)}>
                        Marcar como pago
                      </Button>
                    )}
                    {pagamento.status === "pago" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 dark:text-amber-400"
                        onClick={() => setDesfazendo(pagamento)}
                      >
                        <Undo2 className="h-4 w-4" />
                        Desfazer Pagamento
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden">
          {isLoading && <p className="p-4 text-center text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && pagamentos.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Wallet} titulo="Nenhuma mensalidade gerada" descricao="Ainda não há mensalidades calculadas." />
            </div>
          )}
          {pagamentos.map((pagamento) => (
            <MobileRowCard key={pagamento.id}>
              <MobileRowCardHeader>
                <div className="min-w-0">
                  <p className="font-medium">{pagamento.administrador?.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatarCompetencia(pagamento.mesReferencia)}</p>
                </div>
                <StatusBadge status={pagamento.status} />
              </MobileRowCardHeader>
              <MobileRowField
                label="Imóveis"
                value={`${pagamento.quantidadeImoveis} · base ${formatarMoeda(pagamento.valorTotalAlugueis)} · ${pagamento.percentual}%`}
              />
              <MobileRowField label="Vencimento" value={formatarData(pagamento.dataVencimento)} />
              <MobileRowField label="Mensalidade" value={formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)} />
              <MobileRowActions>
                {pagamento.status !== "pago" && (
                  <Button variant="outline" size="sm" onClick={() => abrirPagar(pagamento)}>
                    Marcar como pago
                  </Button>
                )}
                {pagamento.status === "pago" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-600 dark:text-amber-400"
                    onClick={() => setDesfazendo(pagamento)}
                  >
                    <Undo2 className="h-4 w-4" />
                    Desfazer Pagamento
                  </Button>
                )}
              </MobileRowActions>
            </MobileRowCard>
          ))}
        </div>
      </div>

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

      <Dialog open={Boolean(desfazendo)} onOpenChange={(open) => !open && setDesfazendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desfazer Pagamento</DialogTitle>
            <DialogDescription>
              A mensalidade será marcada como aguardando pagamento novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesfazendo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => desfazendo && mutDesfazer.mutate(desfazendo.id)}
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
