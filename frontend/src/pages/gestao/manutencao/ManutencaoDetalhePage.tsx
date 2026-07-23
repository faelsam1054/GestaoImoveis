import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArrowLeft, Download, FileUp, Paperclip, Trash2, RefreshCw, PauseCircle, PlayCircle } from "lucide-react";
import {
  detalharManutencao,
  anexarComprovanteManutencao,
  removerComprovanteManutencao,
  obterComprovanteBlob,
  baixarComprovanteManutencao,
  pausarRecorrenciaManutencao,
  retomarRecorrenciaManutencao,
  listarRecorrenciasManutencao,
} from "@/api/manutencao";
import { useAuth } from "@/contexts/AuthContext";
import { formatarData, formatarDataHora, formatarMoeda, formatarTamanhoArquivo } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export function ManutencaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeCadastrarManutencao;
  const queryClient = useQueryClient();
  const inputComprovanteRef = useRef<HTMLInputElement>(null);
  const [removendoComprovante, setRemovendoComprovante] = useState(false);

  const { data: gasto, isLoading } = useQuery({
    queryKey: ["manutencao", id],
    queryFn: () => detalharManutencao(id!),
    enabled: Boolean(id),
  });

  const { data: comprovanteBlob, isLoading: carregandoPreview } = useQuery({
    queryKey: ["manutencao", id, "comprovante-blob"],
    queryFn: () => obterComprovanteBlob(id!),
    enabled: Boolean(id) && Boolean(gasto?.comprovantePdfUrl),
  });

  const ehOrigemRecorrente = Boolean(gasto && gasto.recorrencia !== "unica" && !gasto.manutencaoOrigemId);

  const { data: recorrencias } = useQuery({
    queryKey: ["manutencao", id, "recorrencias"],
    queryFn: () => listarRecorrenciasManutencao(id!),
    enabled: Boolean(id) && ehOrigemRecorrente,
  });

  function invalidar() {
    return queryClient.invalidateQueries({ queryKey: ["manutencao", id] });
  }

  const mutPausar = useMutation({
    mutationFn: () => pausarRecorrenciaManutencao(id!),
    onSuccess: async () => {
      toast.success("Recorrência pausada.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRetomar = useMutation({
    mutationFn: () => retomarRecorrenciaManutencao(id!),
    onSuccess: async () => {
      toast.success("Recorrência retomada.");
      await invalidar();
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutAnexar = useMutation({
    mutationFn: (arquivo: File) => anexarComprovanteManutencao(id!, arquivo),
    onSuccess: async () => {
      toast.success("Comprovante anexado.");
      await invalidar();
      await queryClient.invalidateQueries({ queryKey: ["manutencao", id, "comprovante-blob"] });
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRemover = useMutation({
    mutationFn: () => removerComprovanteManutencao(id!),
    onSuccess: async () => {
      toast.success("Comprovante removido.");
      await invalidar();
      setRemovendoComprovante(false);
    },
    onError: (err) => {
      toast.error(mensagemErro(err));
      setRemovendoComprovante(false);
    },
  });

  async function baixar() {
    if (!id) return;
    try {
      await baixarComprovanteManutencao(id, gasto?.comprovanteNomeOriginal ?? "comprovante.pdf");
    } catch (err) {
      toast.error(mensagemErro(err));
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!gasto) return <p className="text-muted-foreground">Gasto de manutenção não encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/manutencao">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Manutenção
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{gasto.descricao}</h2>
          <StatusBadge status={gasto.status} />
        </div>
        <p className="text-muted-foreground">
          {gasto.imovel?.logradouro}, {gasto.imovel?.numero} · <span className="capitalize">{gasto.categoria}</span>
        </p>
      </div>

      {gasto.manutencaoOrigemId && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <RefreshCw className="h-4 w-4 shrink-0 text-primary" />
          <span>
            Esta é uma instância gerada automaticamente a partir de uma recorrência.{" "}
            <Link to={`/manutencao/${gasto.manutencaoOrigemId}`} className="font-medium underline">
              Ver recorrência original
            </Link>
          </span>
        </div>
      )}

      {ehOrigemRecorrente && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Recorrência
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={gasto.recorrencia} />
                <span className="text-muted-foreground">
                  {gasto.ativo ? "Ativa" : "Pausada"} ·{" "}
                  {gasto.dataFimRecorrencia
                    ? `repete até ${formatarData(gasto.dataFimRecorrencia)}`
                    : "sem data de término"}
                </span>
              </div>
              {podeEditar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (gasto.ativo ? mutPausar.mutate() : mutRetomar.mutate())}
                  disabled={mutPausar.isPending || mutRetomar.isPending}
                >
                  {gasto.ativo ? (
                    <>
                      <PauseCircle className="h-4 w-4" />
                      Pausar recorrência
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Retomar recorrência
                    </>
                  )}
                </Button>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Próximas ocorrências geradas</p>
              {(!recorrencias || recorrencias.length === 0) && (
                <p className="text-sm text-muted-foreground">Nenhuma instância gerada ainda.</p>
              )}
              {recorrencias && recorrencias.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {recorrencias.map((instancia) => (
                    <li key={instancia.id}>
                      <Link
                        to={`/manutencao/${instancia.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <span>{instancia.dataExecucao ? formatarData(instancia.dataExecucao) : "-"}</span>
                        <StatusBadge status={instancia.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatarMoeda(gasto.valor)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data de execução</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {gasto.dataExecucao ? formatarData(gasto.dataExecucao) : "Não informada"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {gasto.status === "pago" ? (
              <>
                {formatarData(gasto.dataPagamento)}{" "}
                <span className="text-sm font-normal capitalize text-muted-foreground">
                  ({gasto.formaPagamento})
                </span>
              </>
            ) : (
              "Ainda não pago"
            )}
          </CardContent>
        </Card>
      </div>

      {(gasto.prestadorNome || gasto.prestadorDocumento || gasto.prestadorTelefone) && (
        <Card>
          <CardHeader>
            <CardTitle>Prestador de serviço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Nome</p>
              <p className="font-medium">{gasto.prestadorNome ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CPF/CNPJ</p>
              <p className="font-medium">{gasto.prestadorDocumento ?? "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Telefone</p>
              <p className="font-medium">{gasto.prestadorTelefone ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {gasto.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{gasto.observacoes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Comprovante</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={inputComprovanteRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) mutAnexar.mutate(arquivo);
              e.target.value = "";
            }}
          />

          {!gasto.comprovantePdfUrl && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Nenhum comprovante anexado ainda.</p>
              {podeEditar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inputComprovanteRef.current?.click()}
                  disabled={mutAnexar.isPending}
                >
                  <Paperclip className="h-4 w-4" />
                  {mutAnexar.isPending ? "Enviando..." : "Anexar comprovante"}
                </Button>
              )}
            </div>
          )}

          {gasto.comprovantePdfUrl && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{gasto.comprovanteNomeOriginal ?? "Comprovante"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarTamanhoArquivo(gasto.comprovanteTamanho)} · enviado em{" "}
                    {formatarDataHora(gasto.comprovanteUploadEm)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={baixar}>
                    <Download className="h-4 w-4" />
                    Baixar Comprovante
                  </Button>
                  {podeEditar && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inputComprovanteRef.current?.click()}
                        disabled={mutAnexar.isPending}
                      >
                        <FileUp className="h-4 w-4" />
                        {mutAnexar.isPending ? "Enviando..." : "Substituir Comprovante"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setRemovendoComprovante(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover Comprovante
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-center rounded-lg border bg-muted/30 p-4">
                {carregandoPreview && <Skeleton className="h-[500px] w-[380px]" />}
                {comprovanteBlob && (
                  <Document
                    file={comprovanteBlob}
                    loading={<Skeleton className="h-[500px] w-[380px]" />}
                    error={<p className="text-sm text-muted-foreground">Não foi possível pré-visualizar o PDF.</p>}
                  >
                    <Page pageNumber={1} width={380} />
                  </Document>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={removendoComprovante}
        onOpenChange={setRemovendoComprovante}
        titulo="Remover comprovante"
        descricao="O arquivo do comprovante será removido definitivamente do sistema."
        textoConfirmar="Remover"
        destrutivo
        onConfirm={() => mutRemover.mutate()}
      />
    </div>
  );
}
