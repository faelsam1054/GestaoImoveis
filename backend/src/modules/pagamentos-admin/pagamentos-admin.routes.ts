import { Router } from "express";
import * as controller from "./pagamentos-admin.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

// Todo o modulo e exclusivo do proprietario: o administrador nunca ve
// ou edita a propria mensalidade (regra de negocio explicita).
router.use(authenticate, requireRole("proprietario"));

router.get("/", controller.listar);
router.get("/:id", controller.detalhar);
router.post("/", controller.criar);
router.put("/:id", controller.atualizar);
router.patch("/:id/pagar", controller.marcarComoPago);

export default router;
