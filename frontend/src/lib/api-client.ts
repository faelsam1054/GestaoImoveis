import axios from "axios";

// baseURL vazio + proxy do Vite (dev) ou VITE_API_URL (build de producao).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true, // necessario para o cookie httpOnly do refresh token
});

export interface ErroApi {
  erro: string;
  detalhes?: unknown;
}

export function mensagemErro(err: unknown, fallback = "Ocorreu um erro inesperado"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ErroApi | undefined;
    if (data?.erro) return data.erro;
  }
  return fallback;
}
