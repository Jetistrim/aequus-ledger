import crypto from 'crypto';
import { normalizeForMatching } from '../utils/normalization';

export function gerarHash(data: Date, valor: number, descricao: string): string {
  const dataIso = data.toISOString().split('T')[0];
  const valorComSinal = valor.toFixed(2);
  const descricaoNorm = normalizeForMatching(descricao, { removerStopwordsBancarias: false }).toLowerCase();
  const payload = `${dataIso}|${valorComSinal}|${descricaoNorm}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
