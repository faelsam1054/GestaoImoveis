import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Wallet,
  Wrench,
  ShieldCheck,
  Tags,
  BarChart3,
  Settings,
  Home,
  UserRound,
  Clock,
  Mail,
  Crown,
} from "lucide-react";
import type { PermissaoKey, Usuario } from "@/types/auth";

export interface ItemNav {
  label: string;
  path: string;
  icon: LucideIcon;
  somenteProprietario?: boolean;
  permissao?: PermissaoKey;
  contador?: "pendentesAprovacao";
}

// Nav da area de gestao, compartilhada entre Proprietario e Administrador.
// O Administrador reaproveita as mesmas telas do Proprietario; o que muda e
// quais itens aparecem (conforme permissao granular) e o que fica bloqueado.
export const NAV_GESTAO: ItemNav[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, somenteProprietario: true },
  { label: "Imóveis", path: "/imoveis", icon: Building2, permissao: "podeVerImoveis" },
  { label: "Inquilinos", path: "/inquilinos", icon: Users, permissao: "podeVerInquilinos" },
  { label: "Contratos", path: "/contratos", icon: FileText, permissao: "podeVerContratos" },
  {
    label: "Contratos Pendentes",
    path: "/contratos-pendentes",
    icon: Clock,
    somenteProprietario: true,
    contador: "pendentesAprovacao",
  },
  { label: "Pagamentos", path: "/pagamentos", icon: Wallet, permissao: "podeVerPagamentos" },
  { label: "Manutenção", path: "/manutencao", icon: Wrench, permissao: "podeVerManutencao" },
  {
    label: "Administradores",
    path: "/administradores",
    icon: ShieldCheck,
    permissao: "podeVerAdministradores",
  },
  { label: "Proprietários", path: "/proprietarios", icon: Crown, somenteProprietario: true },
  { label: "Tipos de Imóvel", path: "/tipos-imovel", icon: Tags, somenteProprietario: true },
  { label: "Relatórios", path: "/relatorios", icon: BarChart3, somenteProprietario: true },
  { label: "Emails Enviados", path: "/emails-enviados", icon: Mail, somenteProprietario: true },
  { label: "Configurações", path: "/configuracoes", icon: Settings, somenteProprietario: true },
];

export const NAV_INQUILINO: ItemNav[] = [
  { label: "Meu Imóvel", path: "/meu-imovel", icon: Home },
  { label: "Meu Contrato", path: "/meu-contrato", icon: FileText },
  { label: "Meus Pagamentos", path: "/meus-pagamentos", icon: Wallet },
  { label: "Meu Perfil", path: "/meu-perfil", icon: UserRound },
];

export function itemLiberado(item: ItemNav, usuario: Usuario): boolean {
  if (usuario.role === "proprietario") return true;
  if (item.somenteProprietario) return false;
  if (item.permissao) return Boolean(usuario.permissaoAdministrador?.[item.permissao]);
  return true;
}

export function navItensLiberados(itens: ItemNav[], usuario: Usuario): ItemNav[] {
  return itens.filter((item) => itemLiberado(item, usuario));
}

// Rota inicial apos login, conforme o perfil. Administrador cai na primeira
// tela que ele tem permissao de ver; sem nenhuma, cai no proprio perfil.
export function rotaInicial(usuario: Usuario): string {
  if (usuario.role === "inquilino") return "/meu-imovel";
  if (usuario.role === "proprietario") return "/dashboard";

  const primeiraLiberada = navItensLiberados(NAV_GESTAO, usuario)[0];
  return primeiraLiberada?.path ?? "/perfil";
}
