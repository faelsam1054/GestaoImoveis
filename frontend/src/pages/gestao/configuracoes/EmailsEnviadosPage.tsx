import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { listarEmailsEnviados } from "@/api/email";
import { formatarDataHora } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { MobileRowCard, MobileRowCardHeader, MobileRowField } from "@/components/mobile-row-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function EmailsEnviadosPage() {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["emails-enviados"],
    queryFn: listarEmailsEnviados,
  });

  const lista = emails ?? [];

  return (
    <div>
      <PageHeader
        titulo="Emails Enviados"
        descricao="Histórico de emails do sistema (aprovação de contratos, credenciais de acesso, etc.)."
      />

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
          Carregando...
        </div>
      )}

      {!isLoading && lista.length === 0 && (
        <EmptyState icon={Mail} titulo="Nenhum email enviado" descricao="Os emails enviados pelo sistema aparecerão aqui." />
      )}

      {!isLoading && lista.length > 0 && (
        <>
          {/* Desktop/tablet: tabela */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Modo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="whitespace-nowrap">{formatarDataHora(email.enviadoEm)}</TableCell>
                    <TableCell>{email.destinatario}</TableCell>
                    <TableCell className="max-w-md truncate" title={email.corpo}>
                      {email.assunto}
                    </TableCell>
                    <TableCell>
                      <Badge variant={email.modoMock ? "secondary" : "default"}>
                        {email.modoMock ? "Mock" : "SMTP"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
            {lista.map((email) => (
              <MobileRowCard key={email.id}>
                <MobileRowCardHeader>
                  <div className="min-w-0">
                    <p className="font-medium">{email.assunto}</p>
                    <p className="truncate text-xs text-muted-foreground">{email.destinatario}</p>
                  </div>
                  <Badge variant={email.modoMock ? "secondary" : "default"}>{email.modoMock ? "Mock" : "SMTP"}</Badge>
                </MobileRowCardHeader>
                <MobileRowField label="Data" value={formatarDataHora(email.enviadoEm)} />
              </MobileRowCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
