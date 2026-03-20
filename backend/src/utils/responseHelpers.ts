import { Prisma } from '@prisma/client';
import { contemPix } from '../services/classificadorService';
import { sugerirPorHeuristica } from '../services/heuristicaPixService';

interface TransacaoBase {
  descricao: string;
  classificacao: string;
  dataTransacao: Date;
  valor: Prisma.Decimal | number;
}

export type TransacaoEnriquecida<T extends TransacaoBase> = T & {
  pixAutoClassificado: boolean;
  sugestaoClassificacao: 'PESSOAL' | 'EMPRESA' | null;
  labelHeuristica: string | null;
};

/**
 * Adiciona campos computados de PIX a cada transação retornada pela API.
 * Deve ser chamado em todo endpoint que devolve transações (upload, listagem, relatórios).
 *
 *  - pixAutoClassificado: PIX que já foi classificado automaticamente — flag para revisão visual
 *  - sugestaoClassificacao + labelHeuristica: sugestão heurística apenas para PIX INDEFINIDO
 */
export function enrichTransacoes<T extends TransacaoBase>(
  transacoes: T[],
): TransacaoEnriquecida<T>[] {
  return transacoes.map((t) => {
    const isPix = contemPix(t.descricao);
    const valorNum = Number(t.valor);

    const pixAutoClassificado = isPix && t.classificacao !== 'INDEFINIDO';

    let sugestaoClassificacao: 'PESSOAL' | 'EMPRESA' | null = null;
    let labelHeuristica: string | null = null;

    if (isPix && t.classificacao === 'INDEFINIDO') {
      const heuristica = sugerirPorHeuristica(t.dataTransacao, Math.abs(valorNum));
      sugestaoClassificacao = heuristica.sugestao;
      labelHeuristica = heuristica.label;
    }

    return {
      ...t,
      pixAutoClassificado,
      sugestaoClassificacao,
      labelHeuristica,
    };
  });
}
