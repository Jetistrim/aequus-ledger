import { Categoria } from '@prisma/client';
import { normalizeForMatching } from '../utils/normalization';

export interface Regra {
  palavraChave: string;
  categoria: Categoria;
  subCategoria: string | null;
  prioridade: number;
}

export type Classificacao = 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';

export interface ResultadoClassificacao {
  classificacao: Classificacao;
  categoriaGenerica: string | null;
}

/**
 * Aplica as regras de classificação a uma descrição de transação.
 * Regras com menor número de prioridade são aplicadas primeiro.
 */
export function classificar(descricao: string, regras: Regra[]): ResultadoClassificacao {
  const descNorm = normalizeForMatching(descricao, { removerStopwordsBancarias: true });

  const regrasSorted = [...regras].sort((a, b) => a.prioridade - b.prioridade);

  for (const regra of regrasSorted) {
    const palavras = regra.palavraChave
      .split(',')
      .map((p) => normalizeForMatching(p.trim(), { removerStopwordsBancarias: true }));

    if (palavras.some((p) => p.length > 0 && descNorm.includes(p))) {
      return {
        classificacao: regra.categoria as Classificacao,
        categoriaGenerica: regra.subCategoria ?? null,
      };
    }
  }

  return { classificacao: 'INDEFINIDO', categoriaGenerica: null };
}
