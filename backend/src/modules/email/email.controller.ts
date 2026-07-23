import { asyncHandler } from "../../utils/asyncHandler";
import * as service from "./email.service";

export const listar = asyncHandler(async (req, res) => {
  const emails = await service.listarEmailsEnviados();
  res.json(emails);
});
