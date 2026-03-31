import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { z } from 'zod';
import { ExportFormat, gerarExtratos } from '../services/exportService';
import { resolveRuntimePaths } from '../runtime/runtimePaths';
import { downloadArquivoQuerySchema } from '../validators/querySchemas';

const exportPayloadSchema = z.object({
  formato: z.enum(['csv', 'xlsx']).optional(),
});

export async function exportarExtratos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = exportPayloadSchema.safeParse(req.body ?? {});
    if (!payload.success) {
      res.status(400).json({
        erro: 'Payload inválido.',
        codigo: 'VALIDATION_ERROR',
        detalhes: payload.error.issues.map((issue) => ({
          campo: issue.path.join('.') || 'formato',
          mensagem: issue.message,
        })),
      });
      return;
    }

    const formato: ExportFormat = payload.data.formato ?? 'csv';
    const { pessoalPath, empresaPath } = await gerarExtratos(formato);

    res.json({
      formato,
      pessoal: `/api/export/download?file=${encodeURIComponent(path.basename(pessoalPath))}`,
      empresa: `/api/export/download?file=${encodeURIComponent(path.basename(empresaPath))}`,
    });
  } catch (err) {
    next(err);
  }
}

export async function downloadArquivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = downloadArquivoQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ erro: 'Nome de arquivo inválido.' });
      return;
    }

    const fileName = query.data.file;

    const runtimePaths = resolveRuntimePaths();
    const filePath = path.resolve(runtimePaths.exportsDir, fileName);

    res.download(filePath, fileName, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
}
