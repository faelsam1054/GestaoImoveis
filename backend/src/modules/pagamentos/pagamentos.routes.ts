import { Router } from "express";
import * as controller from "./pagamentos.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermissao } from "../../middlewares/rbac.middleware";
import { criarUploadMiddleware } from "../../middlewares/upload.middleware";

// PDF ou imagem (jpg/png), 10MB - comprovantes de pagamento costumam ser
// print/foto de tela, um pouco maiores que o padrao de 5MB do sistema.
const uploadComprovante = criarUploadMiddleware(
  new Set(["application/pdf", "image/jpeg", "image/png"]),
  10 * 1024 * 1024,
);

const router = Router();

router.use(authenticate);

router.get("/", authorizePermissao("podeVerPagamentos"), controller.listar);
router.get("/:id", authorizePermissao("podeVerPagamentos"), controller.detalhar);
router.post("/", authorizePermissao("podeRegistrarPagamentos"), controller.criarAvulso);
router.put("/:id", authorizePermissao("podeRegistrarPagamentos"), controller.atualizar);
router.patch("/:id/pagar", authorizePermissao("podeRegistrarPagamentos"), controller.marcarComoPago);
router.post(
  "/:id/desfazer-pagamento",
  authorizePermissao("podeRegistrarPagamentos"),
  controller.desfazerPagamento,
);

router.post(
  "/:id/comprovante",
  authorizePermissao("podeRegistrarPagamentos"),
  uploadComprovante.single("comprovante"),
  controller.anexarComprovante,
);
// Sem authorizePermissao aqui de proposito: essa rota tambem precisa ser
// acessivel pelo Inquilino vinculado ao contrato, e authorizePermissao
// bloqueia Inquilino incondicionalmente (ele usa as rotas /me/*). A
// checagem de quem pode baixar acontece dentro do controller.
router.get("/:id/comprovante", controller.baixarComprovante);
router.delete("/:id/comprovante", authorizePermissao("podeRegistrarPagamentos"), controller.removerComprovante);

export default router;
