import { Router } from "express";
import * as controller from "./pagamentos-admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

// Todo o modulo e exclusivo do proprietario: o administrador nunca ve
// ou edita a propria mensalidade (regra de negocio explicita).
router.use(authenticate, requireRole("proprietario"));

router.get("/", controller.listar);
// Precisa vir antes de "/:id" - senao "calcular" seria capturado como um :id.
router.get("/calcular/:administradorId/:mesReferencia", controller.calcular);
router.get("/:id", controller.detalhar);
router.patch("/:id/pagar", controller.marcarComoPago);
router.post("/:id/desfazer-pagamento", controller.desfazerPagamento);

export default router;
