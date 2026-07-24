import type { CorsOptions } from "cors";
import { env } from "./env";

// CORS_ORIGIN aceita uma URL unica (uso local/simples) ou uma lista separada
// por virgula (ex: dominio customizado + preview deployments da Vercel).
const origensPermitidas = env.CORS_ORIGIN.split(",").map((origem) => origem.trim());

export const corsOptions: CorsOptions = {
  origin: origensPermitidas.length === 1 ? origensPermitidas[0] : origensPermitidas,
  credentials: true,
};
