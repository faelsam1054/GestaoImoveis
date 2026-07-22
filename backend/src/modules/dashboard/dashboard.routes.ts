import { Router } from "express";
import * as controller from "./dashboard.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

// Dashboard e exclusivo do proprietario (o administrador nunca tem acesso).
router.use(authenticate, requireRole("proprietario"));

router.get("/resumo", controller.resumo);
router.get("/grafico-receitas-despesas", controller.graficoReceitasDespesas);

export default router;
