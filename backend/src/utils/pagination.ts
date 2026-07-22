export interface Paginacao {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePaginacao(query: { page?: unknown; pageSize?: unknown }): Paginacao {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(query.pageSize ?? "20"), 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginar<T>(dados: T[], total: number, paginacao: Paginacao) {
  return {
    dados,
    paginacao: {
      page: paginacao.page,
      pageSize: paginacao.pageSize,
      total,
      totalPaginas: Math.ceil(total / paginacao.pageSize) || 1,
    },
  };
}
