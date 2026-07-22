import { Router } from "express";
import * as controller from "./administradores.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao, requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerAdministradores"), controller.listar);
router.get("/:id", authorizePermissao("podeVerAdministradores"), controller.detalhar);
router.post("/", requireRole("proprietario"), controller.criar);
router.put("/:id", requireRole("proprietario"), controller.atualizar);
router.delete("/:id", requireRole("proprietario"), controller.desativar);
router.get("/:id/permissoes", requireRole("proprietario"), controller.obterPermissoes);
router.put("/:id/permissoes", requireRole("proprietario"), controller.atualizarPermissoes);

export default router;
