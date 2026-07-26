import type { Transition, Variants } from "framer-motion";

// Easing padrao do projeto: rapido e responsivo (200-300ms), nunca dramatico.
export const EASE_OUT: Transition["ease"] = [0.16, 1, 0.3, 1];

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: EASE_OUT } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } },
};

// Aplicar ao <motion.div> pai; os filhos usam fadeInUp (ou staggerItem) para
// herdar o delay escalonado via propagacao de variants do framer-motion.
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem: Variants = fadeInUp;

export const hoverLift = {
  whileHover: { y: -2, scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2, ease: EASE_OUT },
};

// Transicao entre rotas (usado com AnimatePresence no App/AppRoutes).
export const pageTransition: Variants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.25, ease: EASE_OUT } },
};
