import { z } from "zod";

// multipart/form-data: campos numericos chegam como string, por isso coerce.
export const criarAditivoSchema = z.object({
  descricaoAlteracoes: z.string().min(3),
  valorAnterior: z.coerce.number().nonnegative().optional(),
  valorNovo: z.coerce.number().nonnegative().optional(),
  contratoAnteriorId: z.string().optional(),
});
