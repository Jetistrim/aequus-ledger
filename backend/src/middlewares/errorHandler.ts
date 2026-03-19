import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.message);

  const errorCode = (err as NodeJS.ErrnoException).code;
  const maxTotalUploadSizeMb = process.env.MAX_TOTAL_UPLOAD_SIZE_MB || 100;

  const statusCode =
    errorCode === 'LIMIT_FILE_SIZE' || errorCode === 'LIMIT_TOTAL_FILE_SIZE'
      ? 413
      : 400;

  const message =
    errorCode === 'LIMIT_FILE_SIZE'
      ? `Arquivo muito grande. Tamanho máximo: ${process.env.MAX_FILE_SIZE_MB || 10}MB.`
      : errorCode === 'LIMIT_TOTAL_FILE_SIZE'
        ? `Os arquivos compatíveis enviados ultrapassam o limite total de ${maxTotalUploadSizeMb}MB.`
        : err.message || 'Erro interno no servidor.';

  res.status(statusCode).json({ erro: message });
}
