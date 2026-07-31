import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

export const NOME_APP = "ImovelClaro";
export const TAGLINE_APP = "Gestão clara e simples dos seus imóveis";

interface LogoProps {
  size?: "sm" | "lg";
  className?: string;
}

// Marca visual (icone de casa em caixa colorida), usada no sidebar, no menu
// mobile e na tela de login - centralizada aqui para a cor da marca nunca
// divergir entre os tres lugares.
export function Logo({ size = "sm", className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-sky-500 text-white dark:bg-sky-400 dark:text-slate-950",
        size === "lg" ? "h-14 w-14 rounded-2xl" : "h-8 w-8 rounded-lg",
        className,
      )}
    >
      <Home className={size === "lg" ? "h-7 w-7" : "h-[18px] w-[18px]"} />
    </div>
  );
}
