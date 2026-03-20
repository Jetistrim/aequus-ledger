import multer from 'multer';
import path from 'path';
import { Request } from 'express';

const storage = multer.memoryStorage();
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);

const allowedExtensions = new Set(['.csv', '.ofx', '.xls', '.xlsx']);

const fileFilter: multer.Options['fileFilter'] = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(ext)) {
    return cb(new Error('Formato de arquivo não suportado. Envie arquivos .csv, .ofx, .xls ou .xlsx.'));
  }

  // A extensão é a validação primária. O MIME type de navegadores é pouco confiável,
  // especialmente em uploads de pasta (webkitdirectory), onde valores como
  // application/octet-stream, text/x-csv ou vazios são comuns.
  // Como nenhum arquivo é executado (apenas parseado como dado), a extensão é suficiente.
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 50 },
}).array('arquivos');
