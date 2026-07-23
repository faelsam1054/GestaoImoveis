import { api } from "@/lib/api-client";
import type { EmailEnviado } from "@/types/domain";

export async function listarEmailsEnviados(): Promise<EmailEnviado[]> {
  const { data } = await api.get("/emails-enviados");
  return data;
}
