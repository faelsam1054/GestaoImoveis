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
router.patch("/:id/cpf", requireRole("proprietario"), controller.atualizarCpf);
router.delete("/:id", requireRole("proprietario"), controller.desativar);
router.patch("/:id/ativar", requireRole("proprietario"), controller.ativar);
router.patch("/:id/excluir", requireRole("proprietario"), controller.excluir);
router.patch("/:id/restaurar", requireRole("proprietario"), controller.restaurar);
router.patch("/:id/resetar-senha", requireRole("proprietario"), controller.resetarSenha);

export default router;
