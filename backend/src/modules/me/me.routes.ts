import { Router } from "express";
import * as controller from "./me.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

// Perfil proprio: qualquer role autenticado (proprietario, administrador, inquilino).
router.get("/perfil", controller.obterPerfil);
router.put("/perfil", controller.atualizarPerfil);

// Self-service exclusivo do inquilino.
router.get("/imovel", requireRole("inquilino"), controller.obterImovel);
router.get("/contrato", requireRole("inquilino"), controller.obterContrato);
router.get("/pagamentos", requireRole("inquilino"), controller.listarPagamentos);
router.post("/manutencao", requireRole("inquilino"), controller.relatarProblema);

export default router;
