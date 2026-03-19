import { sanitizeTextInput } from '../../utils/normalization';
import { TransacaoRaw } from './types';
import { decodificarBuffer, parseValor } from './common';

function extrairTagOFX(bloco: string, tag: string): string {
  const regexXml = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const regexSgml = new RegExp(`<${tag}>([^\\r\\n<]+)`, 'i');
  const matchXml = bloco.match(regexXml);
  if (matchXml) return matchXml[1].trim();
  const matchSgml = bloco.match(regexSgml);
  if (matchSgml) return matchSgml[1].trim();
  return '';
}

export function parsearOFX(buffer: Buffer, arquivoOrigem: string): TransacaoRaw[] {
  const texto = decodificarBuffer(buffer);
  const transacoes: TransacaoRaw[] = [];

  try {
    const blocoRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = blocoRegex.exec(texto)) !== null) {
      try {
        const bloco = match[1];

        const dtPosted = extrairTagOFX(bloco, 'DTPOSTED');
        const trnAmt = extrairTagOFX(bloco, 'TRNAMT');
        const memo = sanitizeTextInput(extrairTagOFX(bloco, 'MEMO') || extrairTagOFX(bloco, 'NAME'));

        if (!dtPosted || !trnAmt || !memo) continue;

        const valor = parseValor(trnAmt);
        if (valor === null || valor === 0) continue;

        const y = dtPosted.substring(0, 4);
        const m = dtPosted.substring(4, 6);
        const d = dtPosted.substring(6, 8);
        const dataTransacao = new Date(`${y}-${m}-${d}T00:00:00.000Z`);

        if (Number.isNaN(dataTransacao.getTime())) continue;

        transacoes.push({ dataTransacao, descricao: memo, valor, arquivoOrigem });
      } catch {
        // Ignora transacoes invalidas
      }
    }
  } catch (e) {
    throw new Error(`Erro ao parsear OFX: ${(e as Error).message}`);
  }

  return transacoes;
}
