import type { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Express 5 ja encaminha rejeicoes de handlers async para o error middleware,
// mas mantemos o wrapper explicito por clareza e por seguranca caso o app
// seja rodado sob um adapter que nao tenha esse comportamento.
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
