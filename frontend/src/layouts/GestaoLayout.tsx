import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_GESTAO, navItensLiberados } from "@/lib/nav";

// Layout compartilhado por Proprietario e Administrador: mesmas telas,
// menu filtrado pela permissao granular de cada Administrador.
export function GestaoLayout() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  const itensNav = navItensLiberados(NAV_GESTAO, usuario);

  return <AppShell titulo="Gestalugua" itensNav={itensNav} />;
}
