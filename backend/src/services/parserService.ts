import { parsearCSV } from './parser/csvParser';
import { parsearOFX } from './parser/ofxParser';
import { parsearPlanilha } from './parser/spreadsheetParser';
import type { TransacaoRaw } from './parser/types';
export type { TransacaoRaw } from './parser/types';

export { parsearCSV, parsearOFX, parsearPlanilha };

export async function parseFile(file: Express.Multer.File): Promise<TransacaoRaw[]> {
  const ext = file.originalname.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parsearCSV(file.buffer, file.originalname);
  }

  if (ext === 'ofx') {
    return parsearOFX(file.buffer, file.originalname);
  }

  if (ext === 'xls' || ext === 'xlsx') {
    return parsearPlanilha(file.buffer, file.originalname);
  }

  return [];
}
