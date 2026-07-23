import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import tiposImovelRoutes from "../modules/tipos-imovel/tipos-imovel.routes";
import imoveisRoutes from "../modules/imoveis/imoveis.routes";
import inquilinosRoutes from "../modules/inquilinos/inquilinos.routes";
import contratosRoutes from "../modules/contratos/contratos.routes";
import pagamentosRoutes from "../modules/pagamentos/pagamentos.routes";
import manutencaoRoutes from "../modules/manutencao/manutencao.routes";
import administradoresRoutes from "../modules/administradores/administradores.routes";
import proprietariosRoutes from "../modules/proprietarios/proprietarios.routes";
import aditivosRoutes from "../modules/aditivos/aditivos.routes";
import pagamentosAdminRoutes from "../modules/pagamentos-admin/pagamentos-admin.routes";
import meRoutes from "../modules/me/me.routes";
import auditoriaRoutes from "../modules/auditoria/auditoria.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import relatoriosRoutes from "../modules/relatorios/relatorios.routes";
import emailRoutes from "../modules/email/email.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tipos-imovel", tiposImovelRoutes);
router.use("/imoveis", imoveisRoutes);
router.use("/inquilinos", inquilinosRoutes);
router.use("/contratos", contratosRoutes);
router.use("/pagamentos", pagamentosRoutes);
router.use("/manutencao", manutencaoRoutes);
router.use("/administradores", administradoresRoutes);
router.use("/proprietarios", proprietariosRoutes);
router.use("/aditivos", aditivosRoutes);
router.use("/pagamentos-admin", pagamentosAdminRoutes);
router.use("/me", meRoutes);
router.use("/auditoria", auditoriaRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/relatorios", relatoriosRoutes);
router.use("/emails-enviados", emailRoutes);

export default router;
