import PDFDocument from "pdfkit";
import { salvarPdf, formatarMoeda, formatarData, type ArquivoSalvo } from "./pdf-utils";

export interface DadosRecibo {
  tipo: string;
  competencia: string;
  valorPago: number;
  dataPagamento: Date;
  formaPagamento: string;
  imovel: { logradouro: string; numero: string; bairro: string; cidade: string; estado: string };
  inquilino: { nome: string; cpf: string };
  proprietario: { nome: string };
  // Texto livre opcional, ex: "(parcela 2 de 3)" para caucao parcelada.
  detalheExtra?: string;
}

const ROTULO_TIPO: Record<string, string> = {
  aluguel: "aluguel",
  caucao: "caução",
  multa: "multa",
  outro: "pagamento",
};

const ROTULO_FORMA: Record<string, string> = {
  pix: "PIX",
  transferencia: "transferência bancária",
  dinheiro: "dinheiro",
  boleto: "boleto",
  outro: "outro meio",
};

export async function gerarReciboPdf(dados: DadosRecibo): Promise<ArquivoSalvo> {
  const doc = new PDFDocument({ size: "A4", margin: 56 });

  doc.fontSize(18).font("Helvetica-Bold").text("Recibo de Pagamento", { align: "center" });
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#666666")
    .text(`Emitido em ${formatarData(new Date())}`, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(2);

  doc.fontSize(12).font("Helvetica-Bold").text(formatarMoeda(dados.valorPago));
  doc.moveDown(1);

  const endereco = `${dados.imovel.logradouro}, ${dados.imovel.numero} - ${dados.imovel.bairro}, ${dados.imovel.cidade}/${dados.imovel.estado}`;

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      `Recebi de ${dados.inquilino.nome} (CPF ${dados.inquilino.cpf}) a quantia de ${formatarMoeda(dados.valorPago)}, ` +
        `referente a ${ROTULO_TIPO[dados.tipo] ?? dados.tipo} da competência ${dados.competencia}` +
        `${dados.detalheExtra ? ` ${dados.detalheExtra}` : ""}, relativo ao imóvel localizado em ${endereco}.`,
      { align: "justify", lineGap: 4 },
    );

  doc.moveDown(1.5);
  doc.text(`Forma de pagamento: ${ROTULO_FORMA[dados.formaPagamento] ?? dados.formaPagamento}`);
  doc.text(`Data do pagamento: ${formatarData(dados.dataPagamento)}`);

  doc.moveDown(4);
  doc.text("_________________________________________");
  doc.text(dados.proprietario.nome);
  doc.fontSize(9).fillColor("#666666").text("Proprietário(a)");

  return salvarPdf("recibos", doc);
}
