// Entrypoint serverless da Vercel: NAO chama app.listen (isso so acontece em
// src/server.ts, usado no dev local / num processo long-running tradicional).
// A Vercel trata um app Express exportado como default aqui como um handler
// (req, res) => void comum - ver vercel.json na raiz do backend, que
// reescreve todas as rotas (/api/*, /uploads/*, etc.) para esta funcao.
import { app } from "../src/app";

export default app;
