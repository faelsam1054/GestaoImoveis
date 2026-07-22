import { Router } from "express";
import * as controller from "./pagamentos.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerPagamentos"), controller.listar);
router.get("/:id", authorizePermissao("podeVerPagamentos"), controller.detalhar);
router.post("/", authorizePermissao("podeRegistrarPagamentos"), controller.criarAvulso);
router.put("/:id", authorizePermissao("podeRegistrarPagamentos"), controller.atualizar);
router.patch("/:id/pagar", authorizePermissao("podeRegistrarPagamentos"), controller.marcarComoPago);

export default router;
