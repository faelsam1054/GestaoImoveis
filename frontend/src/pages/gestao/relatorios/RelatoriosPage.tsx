import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import {
  obterRelatorioFinanceiro,
  obterRelatorioPorImovel,
  obterRelatorioInadimplencia,
  obterRelatorioManutencaoPorCategoria,
  baixarExportacao,
} from "@/api/relatorios";
import { formatarCompetencia, formatarMoeda } from "@/lib/format";
import { mensagemErro } from "@/lib/api-client";
import { PageHeader } from "@/components/page-header";
import { InadimplenciaChart } from "@/components/charts/inadimplencia-chart";
import { ManutencaoCategoriaChart } from "@/components/charts/manutencao-categoria-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function BotaoExportar({ caminho, nomeArquivo, pdf = false }: { caminho: string; nomeArquivo: string; pdf?: boolean }) {
  const [baixando, setBaixando] = useState<"csv" | "pdf" | null>(null);

  async function baixar(formato: "csv" | "pdf") {
    setBaixando(formato);
    try {
      await baixarExportacao(caminho, formato, `${nomeArquivo}.${formato}`);
    } catch (err) {
      toast.error(mensagemErro(err, "Não foi possível gerar a exportação."));
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => baixar("csv")} disabled={baixando !== null}>
        <Download className="h-4 w-4" />
        {baixando === "csv" ? "Gerando..." : "Exportar CSV"}
      </Button>
      {pdf && (
        <Button variant="outline" size="sm" onClick={() => baixar("pdf")} disabled={baixando !== null}>
          <FileText className="h-4 w-4" />
          {baixando === "pdf" ? "Gerando..." : "Exportar PDF"}
        </Button>
      )}
    </div>
  );
}

function AbaFinanceiro() {
  const { data, isLoading } = useQuery({ queryKey: ["relatorios", "financeiro"], queryFn: obterRelatorioFinanceiro });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <BotaoExportar caminho="/relatorios/financeiro" nomeArquivo="relatorio-financeiro" pdf />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Receita prevista</TableHead>
                <TableHead>Receita recebida</TableHead>
                <TableHead>Despesas</TableHead>
                <TableHead>Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {data?.porMes.map((linha) => (
                <TableRow key={linha.mes}>
                  <TableCell>{formatarCompetencia(linha.mes)}</TableCell>
                  <TableCell>{formatarMoeda(linha.receitaPrevista)}</TableCell>
                  <TableCell>{formatarMoeda(linha.receitaRecebida)}</TableCell>
                  <TableCell>{formatarMoeda(linha.despesas)}</TableCell>
                  <TableCell className={linha.lucro < 0 ? "text-destructive" : undefined}>
                    {formatarMoeda(linha.lucro)}
                  </TableCell>
                </TableRow>
              ))}
              {data && (
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{formatarMoeda(data.totais.receitaPrevista)}</TableCell>
                  <TableCell>{formatarMoeda(data.totais.receitaRecebida)}</TableCell>
                  <TableCell>{formatarMoeda(data.totais.despesas)}</TableCell>
                  <TableCell>{formatarMoeda(data.totais.lucro)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AbaPorImovel() {
  const { data, isLoading } = useQuery({ queryKey: ["relatorios", "por-imovel"], queryFn: obterRelatorioPorImovel });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <BotaoExportar caminho="/relatorios/por-imovel" nomeArquivo="relatorio-por-imovel" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Receita recebida</TableHead>
                <TableHead>Gastos com manutenção</TableHead>
                <TableHead>Rentabilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum imóvel cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((linha) => (
                <TableRow key={linha.imovelId}>
                  <TableCell>{linha.endereco}</TableCell>
                  <TableCell>{formatarMoeda(linha.receitaRecebida)}</TableCell>
                  <TableCell>{formatarMoeda(linha.gastosManutencao)}</TableCell>
                  <TableCell className={linha.rentabilidade < 0 ? "text-destructive" : "font-medium"}>
                    {formatarMoeda(linha.rentabilidade)}
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

function AbaInadimplencia() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorios", "inadimplencia"],
    queryFn: obterRelatorioInadimplencia,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <BotaoExportar caminho="/relatorios/inadimplencia" nomeArquivo="relatorio-inadimplencia" />
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <InadimplenciaChart dados={data} />
          )}
        </CardContent>
      </Card>
      {data && data.some((l) => l.quantidade > 0) && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Pagamentos em atraso</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data
                  .filter((l) => l.quantidade > 0)
                  .map((linha) => (
                    <TableRow key={linha.mes}>
                      <TableCell>{formatarCompetencia(linha.mes)}</TableCell>
                      <TableCell>{linha.quantidade}</TableCell>
                      <TableCell>{formatarMoeda(linha.valor)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AbaManutencaoCategoria() {
  const { data, isLoading } = useQuery({
    queryKey: ["relatorios", "manutencao-por-categoria"],
    queryFn: obterRelatorioManutencaoPorCategoria,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <BotaoExportar caminho="/relatorios/manutencao-por-categoria" nomeArquivo="relatorio-manutencao-por-categoria" />
      </div>
      <Card>
        <CardContent className="pt-6">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum gasto de manutenção pago registrado.</p>
          ) : (
            <ManutencaoCategoriaChart dados={data} />
          )}
        </CardContent>
      </Card>
      {data && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((linha) => (
                  <TableRow key={linha.categoria}>
                    <TableCell className="capitalize">{linha.categoria}</TableCell>
                    <TableCell>{linha.quantidade}</TableCell>
                    <TableCell>{formatarMoeda(linha.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function RelatoriosPage() {
  return (
    <div>
      <PageHeader
        titulo="Relatórios"
        descricao="Financeiro completo, rentabilidade por imóvel, inadimplência histórica e gastos de manutenção."
      />
      <Tabs defaultValue="financeiro">
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="por-imovel">Por Imóvel</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          <TabsTrigger value="manutencao">Manutenção por Categoria</TabsTrigger>
        </TabsList>
        <TabsContent value="financeiro" className="mt-4">
          <AbaFinanceiro />
        </TabsContent>
        <TabsContent value="por-imovel" className="mt-4">
          <AbaPorImovel />
        </TabsContent>
        <TabsContent value="inadimplencia" className="mt-4">
          <AbaInadimplencia />
        </TabsContent>
        <TabsContent value="manutencao" className="mt-4">
          <AbaManutencaoCategoria />
        </TabsContent>
      </Tabs>
    </div>
  );
}
