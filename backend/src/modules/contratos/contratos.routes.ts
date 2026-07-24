import { Router } from "express";
import * as controller from "./contratos.controller";
import * as caucaoController from "./caucao.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao, requireRole } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

// 10MB (maior que o padrao de 5MB): PDFs de contrato assinado/escaneado
// tendem a ser maiores que os outros anexos do sistema.
const uploadContratoAssinado = criarUploadMiddleware(new Set(["application/pdf"]), 10 * 1024 * 1024);
const uploadAditivo = criarUploadMiddleware(new Set(["application/pdf"]), 10 * 1024 * 1024);

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerContratos"), controller.listar);
// Precisa vir antes de "/:id" - senao "pendentes-aprovacao" seria capturado
// como um :id.
router.get("/pendentes-aprovacao", requireRole("proprietario"), controller.listarPendentesAprovacao);
router.get("/:id", authorizePermissao("podeVerContratos"), controller.detalhar);
router.post("/", authorizePermissao("podeEditarContratos"), controller.criar);
router.post("/:id/aprovar", requireRole("proprietario"), controller.aprovar);
router.post("/:id/rejeitar", requireRole("proprietario"), controller.rejeitar);
router.patch("/:id/encerrar", authorizePermissao("podeEditarContratos"), controller.encerrar);
router.post("/:id/renovar", authorizePermissao("podeEditarContratos"), controller.renovar);
router.post(
  "/:id/contrato-assinado",
  authorizePermissao("podeEditarContratos"),
  uploadContratoAssinado.single("arquivo"),
  controller.anexarContratoAssinado,
);
router.delete("/:id/contrato-assinado", authorizePermissao("podeEditarContratos"), controller.removerContratoAssinado);

router.delete("/:id", authorizePermissao("podeEditarContratos"), controller.excluir);

router.get("/:id/aditivos", authorizePermissao("podeVerContratos"), controller.listarAditivos);
router.post(
  "/:id/aditivo",
  authorizePermissao("podeEditarContratos"),
  uploadAditivo.single("arquivo"),
  controller.criarAditivo,
);

router.get("/:id/caucao", authorizePermissao("podeVerContratos"), caucaoController.listar);
router.post("/:id/caucao/:parcelaId/pagar", authorizePermissao("podeEditarContratos"), caucaoController.pagar);
router.put("/:id/caucao", authorizePermissao("podeEditarContratos"), caucaoController.atualizar);
router.delete("/:id/caucao/:parcelaId", authorizePermissao("podeEditarContratos"), caucaoController.remover);

export default router;
