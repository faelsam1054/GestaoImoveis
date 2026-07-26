import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, LogOut, Home, UserRound, Moon, Sun, ArrowUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useContratosPendentesCount } from "@/hooks/use-contratos-pendentes-count";
import { pageTransition } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

// NavLink com className/children em funcao nao funciona corretamente quando
// envolvido por Tooltip+asChild: o merge de props do Radix Slot faz
// [slotClassName, childClassName].join(" "), e como childClassName seria uma
// funcao, join() a converte via toString() - o texto do codigo fonte vira
// literalmente a className renderizada (alguns tokens validos de Tailwind
// escapam disso por acidente, aplicando estilo "ativo" em todos os itens).
// Por isso o estado ativo e calculado aqui e passado como string simples.
function NavLista({
  itens,
  onNavigate,
  comTooltip,
}: {
  itens: ItemNav[];
  onNavigate?: () => void;
  comTooltip?: boolean;
}) {
  const location = useLocation();
  const pendentesCount = useContratosPendentesCount();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {itens.map((item) => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        const mostrarBadge = item.contador === "pendentesAprovacao" && pendentesCount > 0;

        const link = (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg border-l-4 border-transparent px-2.5 py-2 text-sm font-medium transition-colors duration-200",
              "md:justify-center lg:justify-start",
              isActive
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-600 dark:text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
          >
            <span className="relative shrink-0">
              <item.icon
                className={cn(
                  "h-[18px] w-[18px]",
                  isActive ? "text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400",
                )}
              />
              {mostrarBadge && (
                <span className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white md:block lg:hidden dark:ring-slate-900" />
              )}
            </span>
            <span className="truncate md:hidden lg:inline">{item.label}</span>
            {mostrarBadge && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-semibold text-white md:hidden lg:inline-flex">
                {pendentesCount}
              </span>
            )}
          </Link>
        );

        if (!comTooltip) return link;

        return (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right" className="hidden md:block lg:hidden">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const escuro = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
    >
      {escuro ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
}

interface AppShellProps {
  titulo: string;
  itensNav: ItemNav[];
}

export function AppShell({ titulo, itensNav }: AppShellProps) {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const location = useLocation();

  // O scroll da pagina acontece na janela (o layout usa min-h-screen, entao
  // <main> cresce com o conteudo em vez de clipar internamente) - por isso o
  // listener e o scrollTo sao no window, nao numa ref do <main>.
  useEffect(() => {
    function aoRolar() {
      setMostrarTopo(window.scrollY > 500);
    }
    window.addEventListener("scroll", aoRolar);
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function voltarAoTopo() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!usuario) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
      <aside className="hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-colors duration-200 md:flex md:w-[76px] lg:w-64 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-4 md:justify-center lg:justify-start dark:border-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
            <Home className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 md:hidden lg:block">
            <span className="block truncate font-heading text-sm font-semibold text-slate-900 dark:text-white">
              Gestalugua
            </span>
            <span className="block text-[11px] leading-tight text-slate-500 dark:text-slate-400">
              Sua carteira de aluguéis organizada
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLista itens={itensNav} comTooltip />
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-3 transition-colors duration-200 dark:border-slate-700 dark:bg-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-slate-700 outline-none transition-colors duration-200 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 md:justify-center lg:justify-start dark:text-slate-200 dark:hover:bg-slate-700">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {iniciais(usuario.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col items-start md:hidden lg:flex">
                  <span className="w-full truncate text-sm font-medium text-slate-900 dark:text-white">
                    {usuario.nome}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{ROTULO_ROLE[usuario.role]}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-medium">{usuario.nome}</span>
                <span className="text-xs font-normal text-muted-foreground">{ROTULO_ROLE[usuario.role]}</span>
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
              <DropdownMenuItem onClick={() => void logout()} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm transition-colors duration-200 sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 gap-0 border-slate-200 bg-white p-0 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <SheetTitle className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-4 text-base text-slate-900 dark:border-slate-800 dark:text-white">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white dark:bg-indigo-500">
                    <Home className="h-[18px] w-[18px]" />
                  </div>
                  Gestalugua
                </SheetTitle>
                <div className="py-4">
                  <NavLista itens={itensNav} onNavigate={() => setMenuAberto(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{titulo}</h1>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar>
                    <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                      {iniciais(usuario.nome)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="font-medium">{usuario.nome}</span>
                  <span className="text-xs font-normal text-muted-foreground">{ROTULO_ROLE[usuario.role]}</span>
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
                <DropdownMenuItem onClick={() => void logout()} variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="relative flex-1 p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {mostrarTopo && (
              <motion.button
                type="button"
                onClick={voltarAoTopo}
                aria-label="Voltar ao topo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 left-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
