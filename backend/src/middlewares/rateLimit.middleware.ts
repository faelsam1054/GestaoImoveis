import rateLimit from "express-rate-limit";

// Limita tentativas de login/recuperacao de senha por IP para dificultar
// brute-force e enumeracao de contas.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});
