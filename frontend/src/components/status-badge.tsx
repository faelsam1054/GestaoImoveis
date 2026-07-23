import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROTULOS: Record<string, string> = {
  vago: "Vago",
  alugado: "Alugado",
  manutencao: "Manutenção",
  inativo: "Inativo",
  ativo: "Ativo",
  encerrado: "Encerrado",
  rescindido: "Rescindido",
  renovado: "Renovado",
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  executado: "Executado",
  excluido: "Excluído",
  pendente_aprovacao: "Aguardando Aprovação",
  rejeitado: "Rejeitado",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

// Cores semanticas via tokens do tema (success/warning/destructive/primary),
// consistentes automaticamente entre light e dark mode: emerald para estados
// concluidos/positivos, amber para pendentes/em andamento, rose para atrasos/
// cancelamentos, indigo para informativos, slate para neutros/encerrados.
const AMBER = "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";

const CORES: Record<string, string> = {
  vago: AMBER,
  alugado: "bg-success/15 text-success",
  manutencao: AMBER,
  inativo: "bg-muted text-muted-foreground",
  ativo: "bg-primary/10 text-primary",
  encerrado: "bg-muted text-muted-foreground",
  rescindido: "bg-destructive/10 text-destructive",
  renovado: "bg-primary/10 text-primary",
  pendente: AMBER,
  pago: "bg-success/15 text-success",
  atrasado: "bg-destructive/10 text-destructive",
  orcamento: "bg-muted text-muted-foreground",
  aprovado: "bg-primary/10 text-primary",
  executado: AMBER,
  excluido: "bg-destructive/10 text-destructive",
  pendente_aprovacao: AMBER,
  rejeitado: "bg-destructive/10 text-destructive",
  mensal: "bg-primary/10 text-primary",
  trimestral: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  semestral: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  anual: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("border-transparent font-medium", CORES[status] ?? "bg-muted text-muted-foreground")}>
      {ROTULOS[status] ?? status}
    </Badge>
  );
}
