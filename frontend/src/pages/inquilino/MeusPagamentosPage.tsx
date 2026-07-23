import { useQuery } from "@tanstack/react-query";
import { Download, Wallet } from "lucide-react";
import { listarMeusPagamentos } from "@/api/me";
import { formatarCompetencia, formatarData, formatarMoeda } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { MobileRowCard, MobileRowCardHeader, MobileRowField, MobileRowActions } from "@/components/mobile-row-card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function MeusPagamentosPage() {
  const { data: pagamentos, isLoading } = useQuery({ queryKey: ["me", "pagamentos"], queryFn: listarMeusPagamentos });

  return (
    <div>
      <PageHeader titulo="Meus Pagamentos" descricao="Histórico completo de aluguéis, cauções e multas." />

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}
      {!isLoading && pagamentos?.length === 0 && (
        <EmptyState icon={Wallet} titulo="Nenhum pagamento encontrado" />
      )}

      {!isLoading && pagamentos && pagamentos.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
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
                {pagamentos.map((pagamento) => (
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

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {pagamentos.map((pagamento) => (
              <MobileRowCard key={pagamento.id}>
                <MobileRowCardHeader>
                  <p className="font-medium">{formatarCompetencia(pagamento.competencia)}</p>
                  <StatusBadge status={pagamento.status} />
                </MobileRowCardHeader>
                <MobileRowField label="Tipo" value={<span className="capitalize">{pagamento.tipo}</span>} />
                <MobileRowField label="Vencimento" value={formatarData(pagamento.dataVencimento)} />
                <MobileRowField
                  label="Valor"
                  value={formatarMoeda(pagamento.valorPago ?? pagamento.valorPrevisto)}
                />
                {pagamento.recibo && (
                  <MobileRowActions>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={pagamento.recibo.caminhoArquivo} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        Baixar recibo
                      </a>
                    </Button>
                  </MobileRowActions>
                )}
              </MobileRowCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
