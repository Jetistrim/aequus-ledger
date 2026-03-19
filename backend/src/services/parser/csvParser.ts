import csv from 'csv-parser';
import { Readable } from 'stream';
import { sanitizeTextInput } from '../../utils/normalization';
import { ColunasTransacao, TransacaoRaw } from './types';
import { decodificarBuffer, detectarSeparador, extrairValorLinha, localizarColunasTransacao, parseDataGenerica } from './common';

export async function parsearCSV(buffer: Buffer, arquivoOrigem: string): Promise<TransacaoRaw[]> {
  const texto = decodificarBuffer(buffer);
  const separador = detectarSeparador(texto.split('\n')[0] || texto);

  return new Promise((resolve, reject) => {
    const transacoes: TransacaoRaw[] = [];
    const readable = Readable.from([texto]);
    let colunas: ColunasTransacao | null = null;

    readable
      .pipe(csv({ separator: separador }))
      .on('data', (row: Record<string, string>) => {
        try {
          if (!colunas) {
            colunas = localizarColunasTransacao(row);
          }

          if (!colunas.dataKey || !colunas.descKey) return;

          const dataValor = row[colunas.dataKey];
          const descricao = sanitizeTextInput(row[colunas.descKey]);
          if (!dataValor || !descricao) return;

          const valor = extrairValorLinha(row, colunas);
          if (valor === null || valor === 0) return;

          const dataTransacao = parseDataGenerica(dataValor);
          if (!dataTransacao) return;

          transacoes.push({ dataTransacao, descricao, valor, arquivoOrigem });
        } catch {
          // Ignora linhas invalidas
        }
      })
      .on('end', () => resolve(transacoes))
      .on('error', reject);
  });
}
