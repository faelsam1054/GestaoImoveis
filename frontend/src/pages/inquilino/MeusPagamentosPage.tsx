import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { listarMeusPagamentos } from "@/api/me";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function MeusPagamentosPage() {
  const { data: pagamentos, isLoading } = useQuery({ queryKey: ["me", "pagamentos"], queryFn: listarMeusPagamentos });

  return (
    <div>
      <PageHeader titulo="Meus Pagamentos" descricao="Histórico completo de aluguéis, cauções e multas." />

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Recibo</TableHead>
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
            {!isLoading && pagamentos?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum pagamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {pagamentos?.map((pagamento) => (
              <TableRow key={pagamento.id}>
                <TableCell>{formatarCompetencia(pagamento.competencia)}</TableCell>
                <TableCell className="capitalize">{pagamento.tipo}</TableCell>
                <TableCell>{formatarData(pagamento.dataVencimento)}</TableCell>
                <TableCell>{formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}</TableCell>
                <TableCell>
                  <StatusBadge status={pagamento.status} />
                </TableCell>
                <TableCell className="text-right">
                  {pagamento.recibo ? (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={pagamento.recibo.caminhoArquivo} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        Baixar
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
