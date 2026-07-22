import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CurrencyInputProps {
  id?: string;
  value: number | undefined;
  onValueChange: (valor: number | undefined) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

// Campo de valor em Reais: exibe o prefixo "R$" e formata os digitos digitados
// como centavos (ex: digitar "220000" mostra "R$ 2.200,00"), padrao comum de
// mascara monetaria em pt-BR.
export function CurrencyInput({
  id,
  value,
  onValueChange,
  className,
  disabled,
  placeholder = "0,00",
}: CurrencyInputProps) {
  const [texto, setTexto] = useState(() => (value !== undefined ? formatarCentavos(Math.round(value * 100)) : ""));

  useEffect(() => {
    setTexto(value !== undefined ? formatarCentavos(Math.round(value * 100)) : "");
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const apenasDigitos = e.target.value.replace(/\D/g, "");
    if (!apenasDigitos) {
      setTexto("");
      onValueChange(undefined);
      return;
    }
    const centavos = Number.parseInt(apenasDigitos, 10);
    setTexto(formatarCentavos(centavos));
    onValueChange(centavos / 100);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
        R$
      </span>
      <Input
        id={id}
        inputMode="decimal"
        value={texto}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("pl-9", className)}
      />
    </div>
  );
}
