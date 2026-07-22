import { Router } from "express";
import * as controller from "./contratos.controller";
import * as caucaoController from "./caucao.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

const uploadContratoAssinado = criarUploadMiddleware("contratos", new Set(["application/pdf"]));

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerContratos"), controller.listar);
router.get("/:id", authorizePermissao("podeVerContratos"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarContratos"), controller.criar);
router.patch("/:id/encerrar", authorizePermissao("podeEditarContratos"), controller.encerrar);
router.patch("/:id/rescindir", authorizePermissao("podeEditarContratos"), controller.rescindir);
router.post("/:id/renovar", authorizePermissao("podeEditarContratos"), controller.renovar);
router.post(
  "/:id/contrato-assinado",
  authorizePermissao("podeEditarContratos"),
  uploadContratoAssinado.single("arquivo"),
  controller.anexarContratoAssinado,
);
router.delete("/:id/contrato-assinado", authorizePermissao("podeEditarContratos"), controller.removerContratoAssinado);

router.get("/:id/caucao", authorizePermissao("podeVerContratos"), caucaoController.listar);
router.post("/:id/caucao/:parcelaId/pagar", authorizePermissao("podeEditarContratos"), caucaoController.pagar);
router.put("/:id/caucao", authorizePermissao("podeEditarContratos"), caucaoController.atualizar);
router.delete("/:id/caucao/:parcelaId", authorizePermissao("podeEditarContratos"), caucaoController.remover);

export default router;
