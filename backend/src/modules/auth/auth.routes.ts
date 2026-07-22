import { Router } from "express";
import * as authController from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { loginRateLimiter } from "../../middlewares/rateLimit.middleware";

const router = Router();

router.post("/login", loginRateLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);
router.post("/trocar-senha", authenticate, authController.trocarSenha);
router.post("/esqueci-senha", loginRateLimiter, authController.esqueciSenha);
router.post("/redefinir-senha", authController.redefinirSenha);

export default router;
