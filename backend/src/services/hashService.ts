import crypto from 'crypto';
import { normalizeForMatching } from '../utils/normalization';

function normalizarDescricao(descricao: string): string {
  return normalizeForMatching(descricao, { removerStopwordsBancarias: false }).toLowerCase();
}

function formatarData(data: Date): string {
  const dataIso = data.toISOString().split('T')[0];
  return dataIso;
}

function formatarValor(valor: number): string {
  const valorComSinal = valor.toFixed(2);
  return valorComSinal;
}

export function gerarChaveBaseTransacao(data: Date, valor: number, descricao: string): string {
  const dataIso = formatarData(data);
  const valorComSinal = formatarValor(valor);
  const descricaoNorm = normalizarDescricao(descricao);
  return `${dataIso}|${valorComSinal}|${descricaoNorm}`;
}

function gerarPayloadComOcorrencia(
  data: Date,
  valor: number,
  descricao: string,
  indiceOcorrencia: number,
): string {
  return `${gerarChaveBaseTransacao(data, valor, descricao)}|${indiceOcorrencia}`;
}

export function gerarHash(data: Date, valor: number, descricao: string, indiceOcorrencia = 0): string {
  const payload = gerarPayloadComOcorrencia(data, valor, descricao, indiceOcorrencia);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function gerarCodigoReferencia(
  data: Date,
  valor: number,
  descricao: string,
  indiceOcorrencia: number,
): string {
  const payload = gerarPayloadComOcorrencia(data, valor, descricao, indiceOcorrencia);
  const digest = crypto.createHash('sha256').update(payload).digest('hex');
  const fragmento = BigInt(`0x${digest.slice(0, 15)}`);
  return (fragmento % 100000000n).toString().padStart(8, '0');
}
