import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Usado como alternativa a <Table> em telas pequenas: cada linha vira um
// cartao com os mesmos dados/acoes, empilhados verticalmente.
export function MobileRowCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2.5 border-b p-4 last:border-b-0", className)}>{children}</div>;
}

export function MobileRowCardHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-start justify-between gap-3">{children}</div>;
}

export function MobileRowField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function MobileRowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1 border-t pt-2.5 [&>button]:h-8">{children}</div>;
}
