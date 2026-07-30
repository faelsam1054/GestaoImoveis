import { Router } from "express";
import * as controller from "./notificacoes.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Qualquer role autenticado - cada usuario ve so as suas proprias notificacoes
// (escopado por usuarioId no service, nao por authorizePermissao/requireRole).
router.use(authenticate);

router.get("/", controller.listar);
router.get("/nao-lidas/contagem", controller.contarNaoLidas);
router.patch("/lidas", controller.marcarTodasComoLidas);
router.patch("/:id/lida", controller.marcarComoLida);

export default router;
