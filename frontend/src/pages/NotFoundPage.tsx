import { Link } from "react-router-dom";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-background p-4 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-success/15 blur-3xl"
      />

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <SearchX className="h-8 w-8" />
      </div>
      <div className="relative flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">Erro 404</p>
        <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido. Verifique o link ou volte para o início.
        </p>
      </div>
      <Button asChild className="relative mt-2">
        <Link to="/">
          <Home className="h-4 w-4" />
          Voltar ao início
        </Link>
      </Button>
    </div>
  );
}
