import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { inatividadeExcedida, limparUltimaAtividade, registrarUltimaAtividade } from "@/lib/atividade";
import { SESSION_CONFIG } from "@/config/session";
import type { Usuario } from "@/types/auth";

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => Promise<void>;
  atualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface RequestConfigComRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let refreshEmAndamento: Promise<string | null> | null = null;

    async function tentarRefresh(): Promise<string | null> {
      if (!refreshEmAndamento) {
        refreshEmAndamento = api
          .post("/auth/refresh")
          .then((res) => {
            accessTokenRef.current = res.data.accessToken;
            setUsuario(res.data.usuario);
            return res.data.accessToken as string;
          })
          .catch(() => {
            accessTokenRef.current = null;
            setUsuario(null);
            return null;
          })
          .finally(() => {
            refreshEmAndamento = null;
          });
      }
      return refreshEmAndamento;
    }

    const reqInterceptor = api.interceptors.request.use((config) => {
      if (accessTokenRef.current) {
        config.headers.set("Authorization", `Bearer ${accessTokenRef.current}`);
      }
      return config;
    });

    const resInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as RequestConfigComRetry | undefined;
        const isAuthRoute = originalRequest?.url?.startsWith("/auth/");

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
          originalRequest._retry = true;
          const novoToken = await tentarRefresh();
          if (novoToken) {
            originalRequest.headers.set("Authorization", `Bearer ${novoToken}`);
            return api(originalRequest);
          }
        }

        return Promise.reject(error);
      },
    );

    // Bootstrap: tenta restaurar a sessao a partir do cookie httpOnly do refresh
    // token - a menos que a ultima atividade registrada (ver use-idle-timer.ts)
    // ja tenha passado dos 10min, o que cobre o caso de fechar a aba e voltar
    // depois do prazo (o idle-timer em memoria nao sobrevive ao fechamento).
    if (inatividadeExcedida(SESSION_CONFIG.TIMEOUT)) {
      limparUltimaAtividade();
      api
        .post("/auth/logout")
        .catch(() => {})
        .finally(() => {
          setCarregando(false);
          toast.info("Sessão expirada por inatividade");
        });
    } else {
      tentarRefresh().finally(() => setCarregando(false));
    }

    return () => {
      api.interceptors.request.eject(reqInterceptor);
      api.interceptors.response.eject(resInterceptor);
    };
  }, []);

  async function login(email: string, senha: string) {
    const res = await api.post("/auth/login", { email, senha });
    accessTokenRef.current = res.data.accessToken;
    setUsuario(res.data.usuario);
    registrarUltimaAtividade();
    return res.data.usuario as Usuario;
  }

  async function logout() {
    await api.post("/auth/logout").catch(() => {});
    accessTokenRef.current = null;
    setUsuario(null);
    limparUltimaAtividade();
  }

  function atualizarUsuario(novoUsuario: Usuario) {
    setUsuario(novoUsuario);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
