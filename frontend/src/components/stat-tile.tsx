import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, animate, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { staggerItem, EASE_OUT } from "@/lib/animations";
import { cn } from "@/lib/utils";

const TONE_ICON_BG: Record<string, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  critical: "bg-destructive/10 text-destructive",
};

const TONE_VALUE: Record<string, string> = {
  default: "text-foreground",
  success: "text-success",
  critical: "text-destructive",
};

// Conta de 0 ate o valor final uma unica vez, na primeira vez que o valor
// chega definido (entrada do card) - mudancas posteriores (refetch) so
// atualizam o numero direto, sem recontar do zero.
function useCountUp(alvo: number | undefined, duracao = 1.5) {
  const [valor, setValor] = useState(alvo ?? 0);
  const jaAnimou = useRef(false);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (alvo === undefined) return;
    if (jaAnimou.current || reduzido) {
      setValor(alvo);
      jaAnimou.current = true;
      return;
    }
    jaAnimou.current = true;
    const controls = animate(0, alvo, { duration: duracao, ease: EASE_OUT, onUpdate: setValor });
    return () => controls.stop();
  }, [alvo, duracao, reduzido]);

  return valor;
}

export function StatTile({
  label,
  value,
  icon,
  tone = "default",
  animateValue,
  formatarValor,
  tooltip,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "critical";
  /** Numero cru para a animacao de contagem (0 -> valor em 1.5s). Se omitido, mostra `value` estatico. */
  animateValue?: number;
  /** Formata o numero interpolado a cada frame da contagem (ex: formatarMoeda). */
  formatarValor?: (n: number) => string;
  /** Texto explicativo, exibido num icone de info ao lado do label. */
  tooltip?: string;
}) {
  const contador = useCountUp(animateValue);
  const reduzido = useReducedMotion();
  const valorExibido = animateValue !== undefined && formatarValor ? formatarValor(contador) : value;

  return (
    <motion.div variants={staggerItem} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className="group">
      <Card className="transition-shadow group-hover:shadow-lg">
        <CardContent className="flex items-start gap-4">
          {icon && (
            <motion.div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110",
                TONE_ICON_BG[tone],
              )}
              animate={reduzido ? undefined : { opacity: [1, 0.7, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {icon}
            </motion.div>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={cn("text-2xl leading-tight font-semibold tracking-tight text-balance", TONE_VALUE[tone])}>
              {valorExibido}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
