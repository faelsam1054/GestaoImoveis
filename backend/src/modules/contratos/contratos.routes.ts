import { Router } from "express";
import * as controller from "./contratos.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerContratos"), controller.listar);
router.get("/:id", authorizePermissao("podeVerContratos"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarContratos"), controller.criar);
router.patch("/:id/encerrar", authorizePermissao("podeEditarContratos"), controller.encerrar);
router.patch("/:id/rescindir", authorizePermissao("podeEditarContratos"), controller.rescindir);
router.post("/:id/renovar", authorizePermissao("podeEditarContratos"), controller.renovar);

export default router;
