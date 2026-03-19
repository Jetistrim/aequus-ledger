import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const storage = multer.memoryStorage();
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

const mimeByExtension: Record<string, Set<string>> = {
  '.csv': new Set(['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  '.ofx': new Set(['application/x-ofx', 'application/ofx', 'text/ofx', 'text/plain']),
  '.xls': new Set(['application/vnd.ms-excel', 'application/octet-stream']),
  '.xlsx': new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
  ]),
};

const fileFilter: multer.Options['fileFilter'] = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = mimeByExtension[ext];

  if (!allowedMimes) {
    return cb(new Error('Formato de arquivo não suportado. Envie arquivos .csv, .ofx, .xls ou .xlsx.'));
  }

  if (!allowedMimes.has(file.mimetype)) {
    return cb(new Error('Tipo MIME inválido para a extensão enviada.'));
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 50 },
}).array('arquivos');
