import nodemailer from "nodemailer";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";

interface EnviarEmailParams {
  destinatario: string;
  assunto: string;
  corpo: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function obterTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

// EMAIL_MOCK=true (padrao sem SMTP configurado) so loga no console e grava
// em EmailEnviado, para a tela "Emails Enviados" - nao ha servidor SMTP real
// disponivel neste ambiente de desenvolvimento/demo.
export async function enviarEmail({ destinatario, assunto, corpo }: EnviarEmailParams): Promise<void> {
  const modoMock = env.EMAIL_MOCK || !env.SMTP_HOST;

  if (modoMock) {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: ${assunto}\n${corpo}`);
  } else {
    await obterTransporter().sendMail({
      from: env.SMTP_FROM,
      to: destinatario,
      subject: assunto,
      text: corpo,
    });
  }

  await prisma.emailEnviado.create({
    data: { destinatario, assunto, corpo, modoMock },
  });
}

export async function listarEmailsEnviados() {
  return prisma.emailEnviado.findMany({ orderBy: { enviadoEm: "desc" }, take: 200 });
}
