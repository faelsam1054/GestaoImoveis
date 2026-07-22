import { Router } from "express";
import * as controller from "./tipos-imovel.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

// Visivel para proprietario e administrador (necessario para escolher o tipo
// ao cadastrar/editar um imovel). Gestao do catalogo em si e so do proprietario.
router.get("/", requireRole("proprietario", "administrador"), controller.listar);
router.post("/", requireRole("proprietario"), controller.criar);
router.put("/:id", requireRole("proprietario"), controller.atualizar);
router.patch("/:id/desativar", requireRole("proprietario"), controller.desativar);
router.patch("/:id/reativar", requireRole("proprietario"), controller.reativar);

export default router;
