import path from "node:path";
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

// Arquivos enviados (fotos de imoveis, comprovantes de manutencao/mensalidade).
app.use("/uploads", express.static(path.resolve(env.UPLOADS_DIR)));

app.use("/api", routes);

app.use((req, res, next) => {
  next(new AppError(`Rota nao encontrada: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorMiddleware);
