import csv from 'csv-parser';
import { Readable } from 'stream';
import { sanitizeTextInput } from '../../utils/normalization';
import { ColunasTransacao, TransacaoRaw } from './types';
import { decodificarBuffer, detectarSeparador, extrairValorLinha, localizarColunasTransacao, parseDataGenerica } from './common';

function rowToCells(row: Record<string, string>): string[] {
  return Object.keys(row)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => String(row[key] ?? '').trim());
}

function detectarCabecalho(cells: string[]): { headers: string[]; colunas: ColunasTransacao } | null {
  if (cells.length < 2) return null;

  const headers = cells.map((cell, index) => (cell || `coluna_${index + 1}`).trim());
  const rowCabecalho = Object.fromEntries(headers.map((h) => [h, '']));
  const colunas = localizarColunasTransacao(rowCabecalho);

  if (!colunas.dataKey || !colunas.descKey) {
    return null;
  }

  return { headers, colunas };
}

function extrairTransacaoLinha(
  cells: string[],
  cabecalho: { headers: string[]; colunas: ColunasTransacao },
  arquivoOrigem: string
): TransacaoRaw | null {
  const rowMap = Object.fromEntries(cabecalho.headers.map((header, index) => [header, cells[index] ?? '']));

  const dataValor = rowMap[cabecalho.colunas.dataKey!];
  const descricao = sanitizeTextInput(rowMap[cabecalho.colunas.descKey!]);
  if (!dataValor || !descricao) return null;

  const valor = extrairValorLinha(rowMap, cabecalho.colunas);
  if (valor === null || valor === 0) return null;

  const dataTransacao = parseDataGenerica(dataValor);
  if (!dataTransacao) return null;

  return { dataTransacao, descricao, valor, arquivoOrigem };
}

export async function parsearCSV(buffer: Buffer, arquivoOrigem: string): Promise<TransacaoRaw[]> {
  const texto = decodificarBuffer(buffer);
  const separador = detectarSeparador(texto.split('\n')[0] || texto);

  return new Promise((resolve, reject) => {
    const readable = Readable.from([texto]);
    const cabecalhosDetectados: Array<{ headers: string[]; colunas: ColunasTransacao }> = [];
    const transacoesPorCabecalho: TransacaoRaw[][] = [];

    readable
      .pipe(csv({ separator: separador, headers: false }))
      .on('data', (row: Record<string, string>) => {
        try {
          const cells = rowToCells(row);

          const cabecalhoNovo = detectarCabecalho(cells);
          if (cabecalhoNovo) {
            const existe = cabecalhosDetectados.some((cabecalhoExistente) =>
              cabecalhoExistente.headers.join('|') === cabecalhoNovo.headers.join('|')
            );

            if (!existe) {
              cabecalhosDetectados.push(cabecalhoNovo);
              transacoesPorCabecalho.push([]);
            }
          }

          for (let i = 0; i < cabecalhosDetectados.length; i += 1) {
            const transacao = extrairTransacaoLinha(cells, cabecalhosDetectados[i], arquivoOrigem);
            if (transacao) {
              transacoesPorCabecalho[i].push(transacao);
            }
          }
        } catch {
          // Ignora linhas invalidas
        }
      })
      .on('end', () => {
        const melhor = transacoesPorCabecalho.reduce<TransacaoRaw[]>((acumulado, atual) =>
          atual.length > acumulado.length ? atual : acumulado
        , []);
        resolve(melhor);
      })
      .on('error', reject);
  });
}
