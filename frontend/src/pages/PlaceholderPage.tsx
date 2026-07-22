export function PlaceholderPage({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-semibold tracking-tight">{titulo}</h2>
      <p className="text-muted-foreground">
        {descricao ?? "Esta tela será implementada em uma próxima fase."}
      </p>
    </div>
  );
}
