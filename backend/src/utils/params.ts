import type { Request } from "express";
import { AppError } from "./AppError";

// Express 5 tipa req.params[x] como string | string[] (path-to-regexp v8
// suporta capturas repetidas). Nossas rotas nunca usam esse recurso, entao
// aqui apenas garantimos em runtime que o valor recebido e uma string simples.
export function paramId(req: Request, nome = "id"): string {
  const valor = req.params[nome];
  if (typeof valor !== "string") {
    throw new AppError(`Parametro de rota "${nome}" invalido`, 400);
  }
  return valor;
}
