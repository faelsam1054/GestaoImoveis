import { Router } from "express";
import * as controller from "./inquilinos.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao, requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerInquilinos"), controller.listar);
router.get("/:id", authorizePermissao("podeVerInquilinos"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarInquilinos"), controller.criar);
router.put("/:id", authorizePermissao("podeEditarInquilinos"), controller.atualizar);
router.delete("/:id", requireRole("proprietario"), controller.desativar);

export default router;
