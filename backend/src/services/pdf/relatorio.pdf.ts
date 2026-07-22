import PDFDocument from "pdfkit";
import { formatarMoeda, formatarData } from "./pdf-utils";

interface LinhaFinanceiro {
  mes: string;
  receitaPrevista: number;
  receitaRecebida: number;
  despesas: number;
  lucro: number;
}

interface DadosRelatorioFinanceiro {
  porMes: LinhaFinanceiro[];
  totais: { receitaPrevista: number; receitaRecebida: number; despesas: number; lucro: number };
}

// Retorna o PDFDocument ja com o conteudo desenhado, pronto para ser "pipe"ado
// diretamente na resposta HTTP (relatorio e gerado sob demanda, nao persistido em disco).
export function gerarRelatorioFinanceiroPdf(dados: DadosRelatorioFinanceiro): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(16).font("Helvetica-Bold").text("Relatório Financeiro", { align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#666666")
    .text(`Gerado em ${formatarData(new Date())}`, { align: "center" });
  doc.fillColor("#000000");
  doc.moveDown(1.5);

  const colunas = [
    { label: "Mês", largura: 70 },
    { label: "Receita prevista", largura: 105 },
    { label: "Receita recebida", largura: 105 },
    { label: "Despesas", largura: 90 },
    { label: "Lucro", largura: 90 },
  ];
  const xInicial = doc.x;
  let y = doc.y;

  function desenharLinha(valores: string[], negrito = false) {
    let x = xInicial;
    doc.font(negrito ? "Helvetica-Bold" : "Helvetica").fontSize(9);
    valores.forEach((valor, i) => {
      doc.text(valor, x, y, { width: colunas[i].largura, align: i === 0 ? "left" : "right" });
      x += colunas[i].largura;
    });
    y += 18;
  }

  desenharLinha(
    colunas.map((c) => c.label),
    true,
  );
  doc
    .moveTo(xInicial, y - 2)
    .lineTo(xInicial + colunas.reduce((s, c) => s + c.largura, 0), y - 2)
    .strokeColor("#cccccc")
    .stroke();

  for (const linha of dados.porMes) {
    if (y > 750) {
      doc.addPage();
      y = doc.y;
    }
    desenharLinha([
      linha.mes,
      formatarMoeda(linha.receitaPrevista),
      formatarMoeda(linha.receitaRecebida),
      formatarMoeda(linha.despesas),
      formatarMoeda(linha.lucro),
    ]);
  }

  y += 8;
  doc
    .moveTo(xInicial, y - 4)
    .lineTo(xInicial + colunas.reduce((s, c) => s + c.largura, 0), y - 4)
    .strokeColor("#000000")
    .stroke();

  desenharLinha(
    [
      "Total",
      formatarMoeda(dados.totais.receitaPrevista),
      formatarMoeda(dados.totais.receitaRecebida),
      formatarMoeda(dados.totais.despesas),
      formatarMoeda(dados.totais.lucro),
    ],
    true,
  );

  return doc;
}
