import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";
import { listarContratosPendentes, aprovarContrato, rejeitarContrato } from "@/api/contratos";
import { mensagemErro } from "@/lib/api-client";
import { formatarData, formatarMoeda } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Contrato } from "@/types/domain";

export function ContratosPendentesPage() {
  const queryClient = useQueryClient();
  const [rejeitando, setRejeitando] = useState<Contrato | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const { data: contratos, isLoading } = useQuery({
    queryKey: ["contratos", "pendentes-aprovacao"],
    queryFn: listarContratosPendentes,
  });

  function invalidar() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["contratos"] }),
      queryClient.invalidateQueries({ queryKey: ["imoveis"] }),
    ]);
  }

  const mutAprovar = useMutation({
    mutationFn: (id: string) => aprovarContrato(id),
    onSuccess: async () => {
      toast.success("Contrato aprovado. Pagamentos gerados automaticamente.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRejeitar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => rejeitarContrato(id, motivo),
    onSuccess: async () => {
      toast.success("Contrato rejeitado.");
      await invalidar();
      setRejeitando(null);
      setMotivo("");
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  const lista = contratos ?? [];

  return (
    <div>
      <PageHeader
        titulo="Contratos Pendentes"
        descricao="Contratos cadastrados por Administradores que aguardam sua aprovação."
      />

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}

      {!isLoading && lista.length === 0 && (
        <EmptyState
          icon={Clock}
          titulo="Nenhum contrato pendente"
          descricao="Quando um Administrador cadastrar um novo contrato, ele aparecerá aqui para aprovação."
        />
      )}

      {!isLoading && lista.length > 0 && (
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
                  <TableHead>Cadastrado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell>
                      <Link to={`/contratos/${contrato.id}`} className="hover:underline">
                        {contrato.imovel?.logradouro}, {contrato.imovel?.numero}
                      </Link>
                    </TableCell>
                    <TableCell>{contrato.inquilino?.usuario?.nome}</TableCell>
                    <TableCell>
                      {formatarData(contrato.dataInicio)} - {formatarData(contrato.dataFim)}
                    </TableCell>
                    <TableCell>{formatarMoeda(contrato.valorAluguel)}</TableCell>
                    <TableCell>{contrato.criadoPor?.nome ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success"
                        onClick={() => mutAprovar.mutate(contrato.id)}
                        disabled={mutAprovar.isPending}
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setErro(null);
                          setMotivo("");
                          setRejeitando(contrato);
                        }}
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {lista.map((contrato) => (
              <MobileRowCard key={contrato.id}>
                <MobileRowCardHeader>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {contrato.imovel?.logradouro}, {contrato.imovel?.numero}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{contrato.inquilino?.usuario?.nome}</p>
                  </div>
                </MobileRowCardHeader>
                <MobileRowField
                  label="Período"
                  value={`${formatarData(contrato.dataInicio)} - ${formatarData(contrato.dataFim)}`}
                />
                <MobileRowField label="Valor" value={formatarMoeda(contrato.valorAluguel)} />
                <MobileRowField label="Cadastrado por" value={contrato.criadoPor?.nome ?? "—"} />
                <MobileRowActions>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-success"
                    onClick={() => mutAprovar.mutate(contrato.id)}
                    disabled={mutAprovar.isPending}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setErro(null);
                      setMotivo("");
                      setRejeitando(contrato);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </Button>
                </MobileRowActions>
              </MobileRowCard>
            ))}
          </div>
        </>
      )}

      <Dialog open={Boolean(rejeitando)} onOpenChange={(open) => !open && setRejeitando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar contrato</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O Administrador poderá ver esse motivo posteriormente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivoRejeicao">Motivo</Label>
            <Textarea
              id="motivoRejeicao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              placeholder="Ex: valor do aluguel divergente do combinado com o inquilino"
            />
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitando(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={mutRejeitar.isPending || motivo.trim().length < 3}
              onClick={() => {
                if (!rejeitando) return;
                setErro(null);
                mutRejeitar.mutate({ id: rejeitando.id, motivo });
              }}
            >
              {mutRejeitar.isPending ? "Rejeitando..." : "Rejeitar contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
