import { useQuery } from "@tanstack/react-query";
import { Home, MapPin } from "lucide-react";
import { obterMeuImovel, listarMeusPagamentos } from "@/api/me";
import { formatarData, formatarMoeda } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MeuImovelPage() {
  const { data: imovel, isLoading: carregandoImovel } = useQuery({
    queryKey: ["me", "imovel"],
    queryFn: obterMeuImovel,
  });
  const { data: pagamentos, isLoading: carregandoPagamentos } = useQuery({
    queryKey: ["me", "pagamentos"],
    queryFn: listarMeusPagamentos,
  });

  const proximoVencimento = pagamentos
    ?.filter((p) => p.status !== "pago")
    .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())[0];

  if (carregandoImovel || carregandoPagamentos) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  if (!imovel) {
    return <p className="text-muted-foreground">Nenhum imóvel vinculado a um contrato ativo no momento.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader titulo="Meu Imóvel" descricao="Dados do imóvel que você aluga atualmente." />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {imovel.logradouro}, {imovel.numero}
              </CardTitle>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {imovel.complemento ? `${imovel.complemento} - ` : ""}
                {imovel.bairro}, {imovel.cidade} - {imovel.estado}, {imovel.cep}
              </p>
            </div>
          </div>
          <StatusBadge status={imovel.status} />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tipo: <span className="font-medium text-foreground">{imovel.tipoImovel?.nome ?? "-"}</span>
          </p>
        </CardContent>
      </Card>

      {proximoVencimento ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximo vencimento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="text-2xl font-semibold">{formatarMoeda(proximoVencimento.valorPrevisto)}</span>
            <span className="text-sm text-muted-foreground">
              vencimento em {formatarData(proximoVencimento.dataVencimento)}
            </span>
            <StatusBadge status={proximoVencimento.status} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Nenhum pagamento pendente no momento.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
