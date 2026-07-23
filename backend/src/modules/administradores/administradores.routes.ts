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
router.patch("/:id/desativar", requireRole("proprietario"), controller.desativar);
router.patch("/:id/reativar", requireRole("proprietario"), controller.reativar);
router.delete("/:id", requireRole("proprietario"), controller.excluir);
router.patch("/:id/resetar-senha", requireRole("proprietario"), controller.resetarSenha);
router.get("/:id/permissoes", requireRole("proprietario"), controller.obterPermissoes);
router.put("/:id/permissoes", requireRole("proprietario"), controller.atualizarPermissoes);

router.get("/:id/imoveis", requireRole("proprietario"), controller.listarImoveisVinculados);
router.post("/:id/imoveis", requireRole("proprietario"), controller.vincularImovel);
router.put("/:id/imoveis", requireRole("proprietario"), controller.substituirImoveisVinculados);
router.delete("/:id/imoveis/:imovelId", requireRole("proprietario"), controller.desvincularImovel);

export default router;
