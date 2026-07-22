import { Router } from "express";
import * as controller from "./relatorios.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

// Relatorios financeiros completos sao exclusivos do proprietario.
router.use(authenticate, requireRole("proprietario"));

router.get("/financeiro", controller.financeiro);
router.get("/por-imovel", controller.porImovel);
router.get("/inadimplencia", controller.inadimplencia);
router.get("/manutencao-por-categoria", controller.manutencaoPorCategoria);

export default router;
