import PDFDocument from "pdfkit";
import { salvarPdf, formatarMoeda, formatarData, type ArquivoSalvo } from "./pdf-utils";

export interface DadosContratoPdf {
  dataInicio: Date;
  dataFim: Date;
  diaVencimento: number;
  valorAluguel: number;
  valorCaucao: number | null;
  imovel: { logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; estado: string; cep: string };
  inquilino: { nome: string; cpf: string; email: string };
  proprietario: { nome: string; email: string };
}

export async function gerarContratoPdf(dados: DadosContratoPdf): Promise<ArquivoSalvo> {
  const doc = new PDFDocument({ size: "A4", margin: 56 });

  const endereco = `${dados.imovel.logradouro}, ${dados.imovel.numero}${dados.imovel.complemento ? ` - ${dados.imovel.complemento}` : ""}, ${dados.imovel.bairro}, ${dados.imovel.cidade}/${dados.imovel.estado}, CEP ${dados.imovel.cep}`;

  doc.fontSize(16).font("Helvetica-Bold").text("Contrato de Locação Residencial", { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(11).font("Helvetica-Bold").text("LOCADOR(A):");
  doc.font("Helvetica").text(`${dados.proprietario.nome} - ${dados.proprietario.email}`);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").text("LOCATÁRIO(A):");
  doc.font("Helvetica").text(`${dados.inquilino.nome}, CPF ${dados.inquilino.cpf} - ${dados.inquilino.email}`);
  doc.moveDown(0.8);

  doc.font("Helvetica-Bold").text("IMÓVEL LOCADO:");
  doc.font("Helvetica").text(endereco);
  doc.moveDown(1.5);

  const clausulas: string[] = [
    `1. PRAZO: O presente contrato vigora de ${formatarData(dados.dataInicio)} a ${formatarData(dados.dataFim)}.`,
    `2. ALUGUEL: O valor mensal do aluguel é de ${formatarMoeda(dados.valorAluguel)}, com vencimento todo dia ${dados.diaVencimento} de cada mês.`,
    dados.valorCaucao
      ? `3. CAUÇÃO: Fica estabelecido o valor de caução de ${formatarMoeda(dados.valorCaucao)}, a título de garantia, devolvido ao término do contrato conforme vistoria do imóvel.`
      : "3. CAUÇÃO: Não há caução estabelecida para este contrato.",
    "4. USO DO IMÓVEL: O imóvel destina-se exclusivamente a fins residenciais, não podendo o(a) LOCATÁRIO(A) ceder, sublocar ou emprestar o imóvel, no todo ou em parte, sem autorização prévia e por escrito do(a) LOCADOR(A).",
    "5. CONSERVAÇÃO: O(A) LOCATÁRIO(A) obriga-se a manter o imóvel em bom estado de conservação, comunicando ao(à) LOCADOR(A) qualquer necessidade de reparo ou manutenção.",
    "6. RESCISÃO: O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio, observadas as condições legais aplicáveis.",
  ];

  doc.fontSize(10.5);
  for (const clausula of clausulas) {
    doc.text(clausula, { align: "justify", lineGap: 3 });
    doc.moveDown(0.8);
  }

  doc.moveDown(3);
  doc.fontSize(11).text("_________________________________________");
  doc.text(dados.proprietario.nome);
  doc.fontSize(9).fillColor("#666666").text("Locador(a)");
  doc.fillColor("#000000");

  doc.moveDown(2.5);
  doc.fontSize(11).text("_________________________________________");
  doc.text(dados.inquilino.nome);
  doc.fontSize(9).fillColor("#666666").text("Locatário(a)");

  return salvarPdf("contratos", doc);
}
