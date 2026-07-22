import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  UPLOADS_DIR: z.string().default("./uploads"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variaveis de ambiente invalidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
