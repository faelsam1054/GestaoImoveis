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
router.get("/:id/comprovante", authorizePermissao("podeVerManutencao"), controller.baixarComprovante);
router.delete("/:id/comprovante", authorizePermissao("podeCadastrarManutencao"), controller.removerComprovante);
router.delete("/:id", authorizePermissao("podeCadastrarManutencao"), controller.excluir);

router.get("/:id/recorrencias", authorizePermissao("podeVerManutencao"), controller.listarRecorrencias);
router.patch(
  "/:id/pausar-recorrencia",
  authorizePermissao("podeCadastrarManutencao"),
  controller.pausarRecorrencia,
);
router.patch(
  "/:id/retomar-recorrencia",
  authorizePermissao("podeCadastrarManutencao"),
  controller.retomarRecorrencia,
);

export default router;
