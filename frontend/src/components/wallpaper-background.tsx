import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface WallpaperBackgroundProps {
  /**
   * "login": mais rico, blobs maiores e mais visiveis, drift mais perceptivel.
   * "dashboard": muito sutil, opacidade baixa, quase estatico - so textura.
   */
  variant: "login" | "dashboard";
  /** Efeito ken-burns lento: o fundo inteiro desloca alguns px seguindo o mouse. */
  parallax?: boolean;
}

// Fundo abstrato em gradiente (blobs desfocados), nao uma foto - ver decisao
// registrada na conversa: sem acesso a bancos de imagem reais, essa e a
// alternativa "textura abstrata" que o proprio pedido original já previa.
export function WallpaperBackground({ variant, parallax = false }: WallpaperBackgroundProps) {
  const rico = variant === "login";
  const reduzido = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const x = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const y = useSpring(mouseY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    if (!parallax || reduzido) return;
    function handleMouseMove(e: MouseEvent) {
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      mouseX.set(px * 20);
      mouseY.set(py * 20);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [parallax, reduzido, mouseX, mouseY]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={parallax ? { x, y } : undefined}
    >
      <motion.div
        className={
          rico
            ? "absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
            : "absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
        }
        animate={{ x: [0, 24, 0], y: [0, 16, 0] }}
        transition={{ duration: rico ? 22 : 40, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={
          rico
            ? "absolute -right-32 -bottom-40 h-96 w-96 rounded-full bg-success/15 blur-3xl"
            : "absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-success/5 blur-3xl dark:bg-success/10"
        }
        animate={{ x: [0, -20, 0], y: [0, -12, 0] }}
        transition={{ duration: rico ? 26 : 44, repeat: Infinity, ease: "easeInOut" }}
      />
      {rico && (
        <motion.div
          className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-300/10"
          animate={{ x: [0, 16, 0], y: [0, -20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
