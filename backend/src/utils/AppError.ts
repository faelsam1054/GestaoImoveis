export class AppError extends Error {
  statusCode: number;
  details?: unknown;
  codigo?: string;

  constructor(message: string, statusCode = 400, details?: unknown, codigo?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.codigo = codigo;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
