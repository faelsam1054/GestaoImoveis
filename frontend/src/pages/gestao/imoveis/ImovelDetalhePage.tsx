import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { detalharImovel, adicionarFotoImovel, removerFotoImovel } from "@/api/imoveis";
import { useAuth } from "@/contexts/AuthContext";
import { formatarData, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ImovelDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useAuth();
  const podeEditar = usuario?.role === "proprietario" || usuario?.permissaoAdministrador?.podeEditarImoveis;
  const queryClient = useQueryClient();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const { data: imovel, isLoading } = useQuery({
    queryKey: ["imoveis", id],
    queryFn: () => detalharImovel(id!),
    enabled: Boolean(id),
  });

  const mutAdicionarFoto = useMutation({
    mutationFn: (arquivo: File) => adicionarFotoImovel(id!, arquivo),
    onSuccess: async () => {
      toast.success("Foto adicionada.");
      await queryClient.invalidateQueries({ queryKey: ["imoveis", id] });
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  const mutRemoverFoto = useMutation({
    mutationFn: (fotoId: string) => removerFotoImovel(id!, fotoId),
    onSuccess: async () => {
      toast.success("Foto removida.");
      await queryClient.invalidateQueries({ queryKey: ["imoveis", id] });
    },
    onError: (err) => toast.error(mensagemErro(err)),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!imovel) return <p className="text-muted-foreground">Imóvel não encontrado.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/imoveis">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Imóveis
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {imovel.logradouro}, {imovel.numero}
          </h2>
          <StatusBadge status={imovel.excluidoEm ? "excluido" : imovel.status} />
        </div>
        <p className="text-muted-foreground">
          {imovel.complemento ? `${imovel.complemento} - ` : ""}
          {imovel.bairro}, {imovel.cidade} - {imovel.estado}, {imovel.cep}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tipo</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{imovel.tipoImovel?.nome ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor do aluguel base</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatarMoeda(imovel.valorAluguelBase)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gasto total com manutenção</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatarMoeda(imovel.gastoTotalManutencao ?? 0)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fotos</CardTitle>
          {podeEditar && (
            <>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) mutAdicionarFoto.mutate(arquivo);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="outline" onClick={() => inputFotoRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
                Adicionar foto
              </Button>
            </>
          )}
        </CardHeader>
        <CardContent>
          {imovel.fotos && imovel.fotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {imovel.fotos.map((foto) => (
                <div key={foto.id} className="group relative overflow-hidden rounded-md border">
                  <img src={foto.url} alt="Foto do imóvel" className="h-32 w-full object-cover" />
                  {podeEditar && (
                    <button
                      onClick={() => mutRemoverFoto.mutate(foto.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma foto cadastrada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de contratos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquilino</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!imovel.contratos || imovel.contratos.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum contrato registrado para este imóvel.
                  </TableCell>
                </TableRow>
              )}
              {imovel.contratos?.map((contrato) => (
                <TableRow key={contrato.id}>
                  <TableCell>{contrato.inquilino?.usuario?.nome ?? "-"}</TableCell>
                  <TableCell>
                    {formatarData(contrato.dataInicio)} - {formatarData(contrato.dataFim)}
                  </TableCell>
                  <TableCell>{formatarMoeda(contrato.valorAluguel)}</TableCell>
                  <TableCell>
                    <StatusBadge status={contrato.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Histórico de manutenção</CardTitle>
          <Link to={`/manutencao?imovelId=${imovel.id}`} className="text-xs text-primary hover:underline">
            Ver todas as manutenções deste imóvel →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data de execução</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!imovel.gastosManutencao || imovel.gastosManutencao.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhum gasto de manutenção registrado.
                  </TableCell>
                </TableRow>
              )}
              {imovel.gastosManutencao?.map((gasto) => (
                <TableRow key={gasto.id}>
                  <TableCell>{gasto.descricao}</TableCell>
                  <TableCell className="capitalize">{gasto.categoria}</TableCell>
                  <TableCell>{formatarData(gasto.dataExecucao)}</TableCell>
                  <TableCell>{formatarMoeda(gasto.valor)}</TableCell>
                  <TableCell>
                    <StatusBadge status={gasto.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
