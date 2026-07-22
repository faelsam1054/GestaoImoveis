import type { PermissaoKey, Usuario } from "@/types/auth";

export interface ItemNav {
  label: string;
  path: string;
  somenteProprietario?: boolean;
  permissao?: PermissaoKey;
}

// Nav da area de gestao, compartilhada entre Proprietario e Administrador.
// O Administrador reaproveita as mesmas telas do Proprietario; o que muda e
// quais itens aparecem (conforme permissao granular) e o que fica bloqueado.
export const NAV_GESTAO: ItemNav[] = [
  { label: "Dashboard", path: "/dashboard", somenteProprietario: true },
  { label: "Imóveis", path: "/imoveis", permissao: "podeVerImoveis" },
  { label: "Inquilinos", path: "/inquilinos", permissao: "podeVerInquilinos" },
  { label: "Contratos", path: "/contratos", permissao: "podeVerContratos" },
  { label: "Pagamentos", path: "/pagamentos", permissao: "podeVerPagamentos" },
  { label: "Manutenção", path: "/manutencao", permissao: "podeVerManutencao" },
  { label: "Administradores", path: "/administradores", permissao: "podeVerAdministradores" },
  { label: "Tipos de Imóvel", path: "/tipos-imovel", somenteProprietario: true },
  { label: "Relatórios", path: "/relatorios", somenteProprietario: true },
  { label: "Configurações", path: "/configuracoes", somenteProprietario: true },
];

export const NAV_INQUILINO: ItemNav[] = [
  { label: "Meu Imóvel", path: "/meu-imovel" },
  { label: "Meu Contrato", path: "/meu-contrato" },
  { label: "Meus Pagamentos", path: "/meus-pagamentos" },
  { label: "Meu Perfil", path: "/meu-perfil" },
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
