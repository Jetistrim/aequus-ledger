import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { gerarExtratos } from '../services/exportService';

export async function exportarExtratos(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pessoalPath, empresaPath } = await gerarExtratos();

    // Envia os dois arquivos como links de download via JSON
    res.json({
      pessoal: `/api/export/download?file=${encodeURIComponent(path.basename(pessoalPath))}`,
      empresa: `/api/export/download?file=${encodeURIComponent(path.basename(empresaPath))}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadArquivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fileName = req.query.file as string;
    if (!fileName || path.basename(fileName) !== fileName) {
      res.status(400).json({ erro: 'Nome de arquivo inválido.' });
      return;
    }

    const EXPORTS_DIR = process.env.EXPORTS_DIR || './exports';
    const filePath = path.resolve(EXPORTS_DIR, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
