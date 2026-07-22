import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { PermissaoKey, Role } from "@/types/auth";

// Gate grosso por role. Ex: rotas exclusivas do proprietario (dashboard,
// relatorios, configuracoes) ou exclusivas do inquilino (area /me/*).
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { usuario } = useAuth();
  if (!usuario) return null; // ProtectedRoute (rota pai) ja cobre esse caso

  if (!roles.includes(usuario.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// Gate fino para paginas compartilhadas entre Proprietario e Administrador.
// Espelha o authorizePermissao do backend: proprietario sempre passa,
// administrador so passa com a permissao granular correspondente.
export function PermissaoRoute({ permissao }: { permissao: PermissaoKey }) {
  const { usuario } = useAuth();
  if (!usuario) return null;

  const liberado =
    usuario.role === "proprietario" ||
    (usuario.role === "administrador" && Boolean(usuario.permissaoAdministrador?.[permissao]));

  if (!liberado) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
