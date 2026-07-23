import { Router } from "express";
import * as controller from "./email.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("proprietario"), controller.listar);

export default router;
