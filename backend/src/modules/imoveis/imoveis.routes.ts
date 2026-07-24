import { Router } from "express";
import * as controller from "./imoveis.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao, requireRole } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

const uploadFoto = criarUploadMiddleware();

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerImoveis"), controller.listar);
router.get("/:id", authorizePermissao("podeVerImoveis"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarImoveis"), controller.criar);
router.put("/:id", authorizePermissao("podeEditarImoveis"), controller.atualizar);
router.patch("/:id/ativar", authorizePermissao("podeEditarImoveis"), controller.ativar);
router.patch("/:id/desativar", authorizePermissao("podeEditarImoveis"), controller.desativar);
router.patch("/:id/restaurar", requireRole("proprietario"), controller.restaurar);
router.delete("/:id", requireRole("proprietario"), controller.remover);
router.post("/:id/fotos", authorizePermissao("podeEditarImoveis"), uploadFoto.single("foto"), controller.adicionarFoto);
router.delete("/:id/fotos/:fotoId", authorizePermissao("podeEditarImoveis"), controller.removerFoto);

export default router;
