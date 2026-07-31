import "dotenv/config";
import { z } from "zod";

// jsonwebtoken usa o pacote `ms` para interpretar `expiresIn` quando e uma
// string: uma string so de digitos (ex: "600") e lida como MILISSEGUNDOS, nao
// segundos - "600" vira 0.6s, um token que nasce praticamente expirado. Isso
// ja derrubou a listagem inteira em producao (todo token expirava antes da
// primeira chamada). Normaliza aqui: valor so numerico -> segundos (a
// interpretacao intuitiva de quem configura a env var), preservando "10m"/"7d"
// como estao.
const duracaoJwtSchema = z
  .string()
  .transform((valor) => (/^\d+$/.test(valor.trim()) ? `${valor.trim()}s` : valor));

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: duracaoJwtSchema.default("10m"),
  JWT_REFRESH_EXPIRES_IN: duracaoJwtSchema.default("7d"),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Supabase Storage: destino de todo upload/PDF gerado (ver src/lib/storage.ts).
  // SUPABASE_SECRET_KEY e a service role key - acesso total ao bucket,
  // usada só no backend, nunca exposta ao frontend.
  SUPABASE_URL: z.string(),
  SUPABASE_SECRET_KEY: z.string(),
  EMAIL_MOCK: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("ImovelClaro <no-reply@imovelclaro.local>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
