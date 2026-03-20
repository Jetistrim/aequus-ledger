import * as XLSX from 'xlsx';
import { sanitizeTextInput } from '../../utils/normalization';
import { ColunasTransacao, TransacaoRaw } from './types';
import { extrairValorLinha, localizarColunasTransacao, parseDataGenerica } from './common';

function normalizarCabecalhos(cells: unknown[]): string[] {
  return cells.map((cell, index) => {
    const texto = String(cell ?? '').trim();
    return texto || `coluna_${index + 1}`;
  });
}

function detectarCabecalhos(rows: unknown[][]): Array<{ rowIndex: number; headers: string[]; colunas: ColunasTransacao }> {
  const candidatos: Array<{ rowIndex: number; headers: string[]; colunas: ColunasTransacao }> = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex] ?? [];
    if (!Array.isArray(cells) || cells.length < 2) continue;

    const headers = normalizarCabecalhos(cells);
    const rowCabecalho = Object.fromEntries(headers.map((h) => [h, '']));
    const colunas = localizarColunasTransacao(rowCabecalho);

    if (colunas.dataKey && colunas.descKey) {
      candidatos.push({ rowIndex, headers, colunas });
    }
  }

  return candidatos;
}

function mapearLinha(headers: string[], row: unknown[]): Record<string, unknown> {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
}

function extrairTransacoesComCabecalho(
  rows: unknown[][],
  arquivoOrigem: string,
  cabecalho: { rowIndex: number; headers: string[]; colunas: ColunasTransacao }
): TransacaoRaw[] {
  const transacoes: TransacaoRaw[] = [];

  for (let i = cabecalho.rowIndex + 1; i < rows.length; i += 1) {
    try {
      const row = rows[i] ?? [];
      const rowMap = mapearLinha(cabecalho.headers, row);

      const dataValor = rowMap[cabecalho.colunas.dataKey!];
      const descricao = sanitizeTextInput(rowMap[cabecalho.colunas.descKey!]);
      const valor = extrairValorLinha(rowMap, cabecalho.colunas);

      if (!dataValor || !descricao || valor === null || valor === 0) continue;

      const dataTransacao = parseDataGenerica(dataValor);
      if (!dataTransacao) continue;

      transacoes.push({ dataTransacao, descricao, valor, arquivoOrigem });
    } catch {
      // Ignora linhas invalidas
    }
  }

  return transacoes;
}

export function parsearPlanilha(buffer: Buffer, arquivoOrigem: string): TransacaoRaw[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const transacoes: TransacaoRaw[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });

    if (rows.length === 0) continue;

    const cabecalhos = detectarCabecalhos(rows);
    if (cabecalhos.length === 0) continue;

    let melhor: TransacaoRaw[] = [];
    for (const cabecalho of cabecalhos) {
      const extraidas = extrairTransacoesComCabecalho(rows, arquivoOrigem, cabecalho);
      if (extraidas.length > melhor.length) {
        melhor = extraidas;
      }
    }

    transacoes.push(...melhor);
  }

  return transacoes;
}
