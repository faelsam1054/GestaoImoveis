import { Router } from "express";
import * as controller from "./imoveis.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao, requireRole } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

const uploadFoto = criarUploadMiddleware("imoveis");

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerImoveis"), controller.listar);
router.get("/:id", authorizePermissao("podeVerImoveis"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarImoveis"), controller.criar);
router.put("/:id", authorizePermissao("podeEditarImoveis"), controller.atualizar);
router.delete("/:id", requireRole("proprietario"), controller.remover);
router.post("/:id/fotos", authorizePermissao("podeEditarImoveis"), uploadFoto.single("foto"), controller.adicionarFoto);
router.delete("/:id/fotos/:fotoId", authorizePermissao("podeEditarImoveis"), controller.removerFoto);

export default router;
