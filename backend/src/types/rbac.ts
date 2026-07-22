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
