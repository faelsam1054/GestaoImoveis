import { Router } from "express";
import * as controller from "./proprietarios.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);
router.use(requireRole("proprietario"));

router.get("/", controller.listar);
router.get("/:id", controller.detalhar);
router.post("/", controller.criar);
router.put("/:id", controller.atualizar);
router.patch("/:id/desativar", controller.desativar);
router.patch("/:id/reativar", controller.reativar);
router.delete("/:id", controller.excluir);

export default router;
