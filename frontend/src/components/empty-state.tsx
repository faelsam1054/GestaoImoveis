import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-medium text-foreground">{titulo}</p>
        {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
