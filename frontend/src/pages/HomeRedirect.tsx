import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { rotaInicial } from "@/lib/nav";

// Elemento da rota "/": decide para onde mandar o usuario logado
// conforme o perfil (e forca troca de senha no primeiro acesso).
export function HomeRedirect() {
  const { usuario } = useAuth();
  if (!usuario) return null; // ProtectedRoute (rota pai) ja cobre esse caso

  if (usuario.precisaTrocarSenha) {
    return <Navigate to="/trocar-senha" replace />;
  }

  return <Navigate to={rotaInicial(usuario)} replace />;
}
