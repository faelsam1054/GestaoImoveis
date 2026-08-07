import { z } from "zod";

// multipart/form-data (upload de PDF opcional junto): todo campo chega como
// string, por isso o coerce em tudo, inclusive booleanos ("true"/"false").
const booleanoDeFormData = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((v) => (typeof v === "string" ? v === "true" : v));

// aplicarNoContrato=true (padrao - usado pelo botao "Adicionar Aditivo" na
// aba Aditivos do contrato): o cliente so informa os valores NOVOS: o
// servidor le os valores atuais do Contrato como "anterior", aplica a
// mudanca de verdade (mesmo contrato, nunca cria um novo) e so entao grava o
// historico. Reaproveita a logica de atualizarValores() (clamp de dia,
// propagacao para Pagamento pendente/atrasado).
//
// aplicarNoContrato=false (usado so internamente pelo fluxo de renovacao -
// ver ContratosPage.tsx: o valor novo ja foi aplicado pelo proprio
// renovar() no contrato recem-criado): o cliente informa anterior E novo
// manualmente, apenas para registro historico - nao dispara nenhuma
// escrita adicional no Contrato.
export const criarAditivoSchema = z
  .object({
    descricaoAlteracoes: z.string().min(3),
    dataAditivo: z.coerce.date().optional(),
    aplicarNoContrato: booleanoDeFormData,

    valorAluguelNovo: z.coerce.number().positive().optional(),
    diaVencimentoNovo: z.coerce.number().int().min(1).max(31).optional(),
    dataFimNova: z.coerce.date().optional(),

    // So usados quando aplicarNoContrato=false.
    valorAluguelAnterior: z.coerce.number().nonnegative().optional(),
    diaVencimentoAnterior: z.coerce.number().int().min(1).max(31).optional(),
    dataFimAnterior: z.coerce.date().optional(),

    atualizarPagamentosFuturos: booleanoDeFormData,
    atualizarDataVencimentoPendentes: booleanoDeFormData,
  })
  .transform((d) => ({ ...d, aplicarNoContrato: d.aplicarNoContrato ?? true }));
