import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { fadeInUp, EASE_OUT } from "@/lib/animations";

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
  const reduzido = useReducedMotion();

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center shadow-sm"
    >
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted"
        animate={reduzido ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-6 w-6 text-muted-foreground" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2, ease: EASE_OUT }}
        className="flex flex-col gap-1"
      >
        <p className="font-medium text-foreground">{titulo}</p>
        {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      </motion.div>
      {acao}
    </motion.div>
  );
}
