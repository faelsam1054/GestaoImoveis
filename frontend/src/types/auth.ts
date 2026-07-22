export type Role = "proprietario" | "administrador" | "inquilino";

export type PermissaoKey =
  | "podeVerImoveis"
  | "podeEditarImoveis"
  | "podeVerInquilinos"
  | "podeEditarInquilinos"
  | "podeVerContratos"
  | "podeEditarContratos"
  | "podeVerPagamentos"
  | "podeRegistrarPagamentos"
  | "podeVerManutencao"
  | "podeCadastrarManutencao"
  | "podeVerAdministradores"
  | "podeEditarPerfil";

export type PermissaoAdministrador = Record<PermissaoKey, boolean>;

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  precisaTrocarSenha: boolean;
  permissaoAdministrador?: PermissaoAdministrador | null;
}
