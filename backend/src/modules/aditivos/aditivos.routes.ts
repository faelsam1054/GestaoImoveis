import { Router } from "express";
import * as controller from "./aditivos.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/:id/download", authorizePermissao("podeVerContratos"), controller.download);
router.delete("/:id", authorizePermissao("podeEditarContratos"), controller.excluir);

export default router;
