import { Router } from "express";
import * as controller from "./auditoria.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate, requireRole("proprietario"));

router.get("/", controller.listar);

export default router;
