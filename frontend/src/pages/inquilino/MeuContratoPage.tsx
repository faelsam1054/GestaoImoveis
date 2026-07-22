import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, TriangleAlert } from "lucide-react";
import { obterMeuContrato, relatarProblema, type RelatarProblemaInput } from "@/api/me";
import { CATEGORIA_MANUTENCAO } from "@/types/domain";
import { formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FORM_VAZIO: RelatarProblemaInput = { descricao: "", categoria: "outros" };

export function MeuContratoPage() {
  const queryClient = useQueryClient();
  const { data: contrato, isLoading } = useQuery({ queryKey: ["me", "contrato"], queryFn: obterMeuContrato });

  const [dialogAberto, setDialogAberto] = useState(false);
  const [form, setForm] = useState<RelatarProblemaInput>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  const mutRelatar = useMutation({
    mutationFn: (input: RelatarProblemaInput) => relatarProblema(input),
    onSuccess: async () => {
      toast.success("Problema relatado. O proprietário foi notificado e irá avaliar o orçamento.");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setDialogAberto(false);
      setForm(FORM_VAZIO);
    },
    onError: (err) => setErro(mensagemErro(err)),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!contrato) return <p className="text-muted-foreground">Nenhum contrato ativo encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Meu Contrato"
        descricao="Dados do contrato vigente."
        acoes={
          <Button
            variant="outline"
            onClick={() => {
              setErro(null);
              setForm(FORM_VAZIO);
              setDialogAberto(true);
            }}
          >
            <TriangleAlert className="h-4 w-4" />
            Relatar problema
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <StatusBadge status={contrato.status} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor do aluguel</p>
            <p className="font-medium">{formatarMoeda(contrato.valorAluguel)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Início do contrato</p>
            <p className="font-medium">{formatarData(contrato.dataInicio)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fim do contrato</p>
            <p className="font-medium">{formatarData(contrato.dataFim)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Dia de vencimento</p>
            <p className="font-medium">Todo dia {contrato.diaVencimento}</p>
          </div>
          {contrato.valorCaucao ? (
            <div>
              <p className="text-sm text-muted-foreground">Caução</p>
              <p className="font-medium">{formatarMoeda(contrato.valorCaucao)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-medium">Contrato em PDF</p>
            <p className="text-sm text-muted-foreground">
              {contrato.contratoAssinadoUrl
                ? "Versão assinada disponível para download."
                : contrato.arquivoPdfUrl
                  ? "Versão gerada pelo sistema disponível para download."
                  : "Ainda não disponível para download."}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!contrato.contratoAssinadoUrl && !contrato.arquivoPdfUrl}
            asChild={Boolean(contrato.contratoAssinadoUrl ?? contrato.arquivoPdfUrl)}
          >
            {contrato.contratoAssinadoUrl ?? contrato.arquivoPdfUrl ? (
              <a href={contrato.contratoAssinadoUrl ?? contrato.arquivoPdfUrl!} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                Baixar contrato
              </a>
            ) : (
              <span>
                <Download className="h-4 w-4" />
                Baixar contrato
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatar problema</DialogTitle>
            <DialogDescription>
              Descreva o problema no imóvel. Isso cria um chamado de manutenção que fica pendente de aprovação do
              proprietário.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoria}
                onValueChange={(v) => setForm({ ...form, categoria: v as RelatarProblemaInput["categoria"] })}
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
              <Label htmlFor="descricao">Descreva o problema</Label>
              <Textarea
                id="descricao"
                rows={4}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
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
                mutRelatar.mutate(form);
              }}
              disabled={mutRelatar.isPending || form.descricao.length < 5}
            >
              {mutRelatar.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
