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
};

// Classes de cor explicitas (o Badge do shadcn nao tem variantes success/warning
// prontas): verde para estados concluidos/positivos, ambar para pendentes,
// vermelho para atrasos/cancelamentos, cinza para neutros/encerrados.
const CORES: Record<string, string> = {
  vago: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  alugado: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  manutencao: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  inativo: "bg-muted text-muted-foreground",
  ativo: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  encerrado: "bg-muted text-muted-foreground",
  rescindido: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  renovado: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  pendente: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  pago: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  atrasado: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  orcamento: "bg-muted text-muted-foreground",
  aprovado: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  executado: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("border-transparent font-medium", CORES[status] ?? "bg-muted text-muted-foreground")}>
      {ROTULOS[status] ?? status}
    </Badge>
  );
}
