import { api } from "@/lib/api-client";
import type { Administrador, Imovel, PermissaoAdministrador } from "@/types/domain";
import type { CredenciaisTemporarias } from "./inquilinos";

export interface AdministradorInput {
  nome: string;
  email: string;
}

export async function listarAdministradores(): Promise<Administrador[]> {
  const { data } = await api.get("/administradores");
  return data;
}

export async function detalharAdministrador(id: string): Promise<Administrador> {
  const { data } = await api.get(`/administradores/${id}`);
  return data;
}

export async function criarAdministrador(
  input: AdministradorInput,
): Promise<{ administrador: Administrador; credenciaisTemporarias: CredenciaisTemporarias }> {
  const { data } = await api.post("/administradores", input);
  return data;
}

export async function atualizarAdministrador(
  id: string,
  input: Partial<AdministradorInput & { ativo: boolean }>,
): Promise<Administrador> {
  const { data } = await api.put(`/administradores/${id}`, input);
  return data;
}

export async function desativarAdministrador(id: string): Promise<void> {
  await api.delete(`/administradores/${id}`);
}

export async function resetarSenhaAdministrador(
  id: string,
): Promise<{ credenciaisTemporarias: CredenciaisTemporarias }> {
  const { data } = await api.patch(`/administradores/${id}/resetar-senha`);
  return data;
}

export async function obterPermissoesAdministrador(id: string): Promise<PermissaoAdministrador> {
  const { data } = await api.get(`/administradores/${id}/permissoes`);
  return data;
}

export async function atualizarPermissoesAdministrador(
  id: string,
  input: Partial<PermissaoAdministrador>,
): Promise<PermissaoAdministrador> {
  const { data } = await api.put(`/administradores/${id}/permissoes`, input);
  return data;
}

export async function listarImoveisVinculados(id: string): Promise<Imovel[]> {
  const { data } = await api.get(`/administradores/${id}/imoveis`);
  return data;
}

export async function substituirImoveisVinculados(id: string, imovelIds: string[]): Promise<Imovel[]> {
  const { data } = await api.put(`/administradores/${id}/imoveis`, { imovelIds });
  return data;
}
