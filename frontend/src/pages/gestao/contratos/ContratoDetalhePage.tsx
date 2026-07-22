import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Trash2 } from "lucide-react";
import { detalharContrato, enviarContratoAssinado, removerContratoAssinado } from "@/api/contratos";
import { listarParcelasCaucao, pagarParcelaCaucao, type PagarParcelaCaucaoInput } from "@/api/caucao";
import { useAuth } from "@/contexts/AuthContext";
import { FORMA_PAGAMENTO_CAUCAO, type CaucaoParcela } from "@/types/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarContratos;
  const queryClient = useQueryClient();
  const inputContratoRef = useRef<HTMLInputElement>(null);

  const [pagando, setPagando] = useState<CaucaoParcela | null>(null);
  const [formPagar, setFormPagar] = useState<PagarParcelaCaucaoInput>({
    formaPagamento: "pix",
    observacoes: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [removendoContrato, setRemovendoContrato] = useState(false);

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

      <ConfirmDialog
        open={removendoContrato}
        onOpenChange={setRemovendoContrato}
        titulo="Remover contrato assinado"
        descricao="O PDF enviado será removido. O contrato gerado automaticamente pelo sistema não é afetado."
        textoConfirmar="Remover"
        destrutivo
        onConfirm={() => mutRemoverContrato.mutate()}
      />
    </div>
  );
}
