import { Categoria } from '@prisma/client';
import { normalizeForMatching } from '../utils/normalization';
import { sugerirPorHeuristica } from './heuristicaPixService';

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
  sugestaoClassificacao: 'PESSOAL' | 'EMPRESA' | null;
}

export function contemPix(descricao: string): boolean {
  const descricaoSemStopwords = normalizeForMatching(descricao, { removerStopwordsBancarias: false });
  return /\bPIX\b/.test(descricaoSemStopwords);
}

function encontrarPrimeiraRegraCorrespondente(descricaoNormalizada: string, regras: Regra[]): Regra | null {
  const regrasSorted = [...regras].sort((a, b) => a.prioridade - b.prioridade);

  for (const regra of regrasSorted) {
    const palavras = regra.palavraChave
      .split(',')
      .map((p) => normalizeForMatching(p.trim(), { removerStopwordsBancarias: true }));

    if (palavras.some((p) => p.length > 0 && descricaoNormalizada.includes(p))) {
      return regra;
    }
  }

  return null;
}

/**
 * Aplica as regras de classificação a uma descrição de transação.
 * Regras com menor número de prioridade são aplicadas primeiro.
 *
 * Para transações com indicador PIX:
 *   - Se houver regra correspondente → classifica normalmente (PESSOAL/EMPRESA).
 *   - Se não houver regra → INDEFINIDO com sugestão heurística por valor/dia da semana.
 */
export function classificar(
  descricao: string,
  regras: Regra[],
  dataTransacao?: Date,
  valorAbsoluto?: number,
): ResultadoClassificacao {
  const descNorm = normalizeForMatching(descricao, { removerStopwordsBancarias: true });

  const regraCorrespondente = encontrarPrimeiraRegraCorrespondente(descNorm, regras);

  if (regraCorrespondente) {
    return {
      classificacao: regraCorrespondente.categoria as Classificacao,
      categoriaGenerica: regraCorrespondente.subCategoria ?? null,
      sugestaoClassificacao: null,
    };
  }

  // Sem regra: INDEFINIDO — aplica heurística quando for PIX e os dados de data/valor estiverem disponíveis
  const heuristica =
    contemPix(descricao) && dataTransacao != null && valorAbsoluto != null
      ? sugerirPorHeuristica(dataTransacao, valorAbsoluto)
      : { sugestao: null as null };

  return {
    classificacao: 'INDEFINIDO',
    categoriaGenerica: null,
    sugestaoClassificacao: heuristica.sugestao,
  };
}
