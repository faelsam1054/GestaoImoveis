import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";
import { AppError } from "./utils/AppError";

export const app = express();

// A Vercel (e qualquer PaaS serverless) roda a app atras de 1 proxy reverso -
// sem isso, express-rate-limit nao confia no X-Forwarded-For e loga erro de
// validacao a cada requisicao, alem do IP de auditoria (getClientIp) ficar
// incorreto. "1" = confia exatamente 1 hop de proxy (o da propria Vercel).
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Arquivos enviados (fotos de imoveis, comprovantes, PDFs gerados) vivem no
// Supabase Storage agora (ver src/lib/storage.ts), nao mais servidos daqui -
// o filesystem local e efemero em ambiente serverless.
app.use("/api", routes);

app.use((req, res, next) => {
  next(new AppError(`Rota nao encontrada: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorMiddleware);
