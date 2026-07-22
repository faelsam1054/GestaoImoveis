import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Menu, LogOut, Home, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ItemNav } from "@/lib/nav";

const ROTULO_ROLE: Record<string, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  inquilino: "Inquilino",
};

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function NavLista({ itens, onNavigate }: { itens: ItemNav[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {itens.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

interface AppShellProps {
  titulo: string;
  itensNav: ItemNav[];
}

export function AppShell({ titulo, itensNav }: AppShellProps) {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  if (!usuario) return null;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Home className="h-5 w-5 text-primary" />
          <span className="font-semibold">Gestão de Aluguéis</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLista itens={itensNav} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="flex h-16 items-center border-b px-4 text-base">
                  Gestão de Aluguéis
                </SheetTitle>
                <div className="py-4">
                  <NavLista itens={itensNav} onNavigate={() => setMenuAberto(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">{titulo}</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar>
                  <AvatarFallback>{iniciais(usuario.nome)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-medium">{usuario.nome}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {ROTULO_ROLE[usuario.role]}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {usuario.role === "administrador" && (
                <DropdownMenuItem asChild>
                  <Link to="/perfil">
                    <UserRound className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
