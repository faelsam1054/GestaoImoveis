import type { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { paraCsv } from "../../utils/csv";
import { gerarRelatorioFinanceiroPdf } from "../../services/pdf/relatorio.pdf";
import * as service from "./relatorios.service";
import { relatorioQuerySchema } from "./relatorios.schema";

function enviarCsv(res: Response, nomeArquivo: string, linhas: Record<string, unknown>[]) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.send(paraCsv(linhas));
}

export const financeiro = asyncHandler(async (req, res) => {
  const { meses, formato } = relatorioQuerySchema.parse(req.query);
  const dados = await service.financeiro(meses);

  if (formato === "csv") {
    return enviarCsv(res, "relatorio-financeiro.csv", dados.porMes);
  }
  if (formato === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="relatorio-financeiro.pdf"');
    const doc = gerarRelatorioFinanceiroPdf(dados);
    doc.pipe(res);
    doc.end();
    return;
  }
  res.json(dados);
});

export const porImovel = asyncHandler(async (req, res) => {
  const { formato } = relatorioQuerySchema.parse(req.query);
  const dados = await service.porImovel();

  if (formato === "csv") {
    return enviarCsv(res, "relatorio-por-imovel.csv", dados);
  }
  if (formato === "pdf") {
    throw new AppError("Exportacao em PDF nao disponivel para este relatorio. Use formato=csv.", 400);
  }
  res.json(dados);
});

export const inadimplencia = asyncHandler(async (req, res) => {
  const { meses, formato } = relatorioQuerySchema.parse(req.query);
  const dados = await service.inadimplencia(meses);

  if (formato === "csv") {
    return enviarCsv(res, "relatorio-inadimplencia.csv", dados);
  }
  if (formato === "pdf") {
    throw new AppError("Exportacao em PDF nao disponivel para este relatorio. Use formato=csv.", 400);
  }
  res.json(dados);
});

export const manutencaoPorCategoria = asyncHandler(async (req, res) => {
  const { formato } = relatorioQuerySchema.parse(req.query);
  const dados = await service.manutencaoPorCategoria();

  if (formato === "csv") {
    return enviarCsv(res, "relatorio-manutencao-por-categoria.csv", dados);
  }
  if (formato === "pdf") {
    throw new AppError("Exportacao em PDF nao disponivel para este relatorio. Use formato=csv.", 400);
  }
  res.json(dados);
});
