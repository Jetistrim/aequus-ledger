import * as XLSX from 'xlsx';
import { sanitizeTextInput } from '../../utils/normalization';
import { TransacaoRaw } from './types';
import { extrairValorLinha, localizarColunasTransacao, parseDataGenerica } from './common';

export function parsearPlanilha(buffer: Buffer, arquivoOrigem: string): TransacaoRaw[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const transacoes: TransacaoRaw[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    if (rows.length === 0) continue;

    const colunas = localizarColunasTransacao(rows[0]);
    if (!colunas.dataKey || !colunas.descKey) continue;

    for (const row of rows) {
      try {
        const dataValor = row[colunas.dataKey];
        const descricao = sanitizeTextInput(row[colunas.descKey]);
        const valor = extrairValorLinha(row, colunas);

        if (!dataValor || !descricao || valor === null || valor === 0) continue;

        const dataTransacao = parseDataGenerica(dataValor);
        if (!dataTransacao) continue;

        transacoes.push({ dataTransacao, descricao, valor, arquivoOrigem });
      } catch {
        // Ignora linhas invalidas
      }
    }
  }

  return transacoes;
}
