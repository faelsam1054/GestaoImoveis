import { Router } from "express";
import * as controller from "./manutencao.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

const uploadComprovante = criarUploadMiddleware("manutencao");

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerManutencao"), controller.listar);
router.get("/:id", authorizePermissao("podeVerManutencao"), controller.detalhar);
router.post("/", authorizePermissao("podeCadastrarManutencao"), controller.criar);
router.put("/:id", authorizePermissao("podeCadastrarManutencao"), controller.atualizar);
router.patch("/:id/status", authorizePermissao("podeCadastrarManutencao"), controller.atualizarStatus);
router.post(
  "/:id/comprovante",
  authorizePermissao("podeCadastrarManutencao"),
  uploadComprovante.single("comprovante"),
  controller.anexarComprovante,
);

export default router;
