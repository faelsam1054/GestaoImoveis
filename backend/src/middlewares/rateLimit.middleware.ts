import rateLimit from "express-rate-limit";

// Limita tentativas de login por IP para dificultar brute-force.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
});

// Recuperacao de senha: janela mais longa e limite mais baixo - previne
// enumeracao de contas/spam de emails de reset, nao so brute-force.
export const esqueciSenhaRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Tente novamente mais tarde." },
});
