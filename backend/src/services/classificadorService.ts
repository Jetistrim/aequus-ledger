import { Categoria } from '@prisma/client';
import { normalizeForMatching } from '../utils/normalization';
import { classificarPixComHeuristica } from './heuristicaPixService';
import { classificarNaoPixComHeuristica } from './heuristicaNaoPixService';

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

export type MecanismoClassificacao =
  | 'REGRA_EXPLICITA'
  | 'HEURISTICA_PIX'
  | 'HEURISTICA_NAO_PIX'
  | 'FALLBACK';

export interface ResultadoClassificacaoDiagnostico extends ResultadoClassificacao {
  mecanismo: MecanismoClassificacao;
  confianca: number;
  regraAplicada: string | null;
  detalhes: string;
}

/**
 * Retorna true quando a descricao contem o token PIX como palavra isolada.
 *
 * A normalizacao preserva stopwords bancarias para nao remover o proprio token PIX.
 */
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
 * Classifica uma transacao no funil abaixo:
 * 1) Regras explicitas (prioridade do banco)
 * 2) Heuristica PIX (quando descricao contem PIX)
 * 3) Heuristica NAO-PIX para debito/cartao
 * 4) INDEFINIDO (fallback conservador)
 */
export function classificar(
  descricao: string,
  regras: Regra[],
  dataTransacao?: Date,
  valorAbsoluto?: number,
  tipoTransacao?: 'entrada' | 'saida',
): ResultadoClassificacao {
  const diagnostico = classificarComDiagnostico(
    descricao,
    regras,
    dataTransacao,
    valorAbsoluto,
    tipoTransacao,
  );

  return {
    classificacao: diagnostico.classificacao,
    categoriaGenerica: diagnostico.categoriaGenerica,
    sugestaoClassificacao: diagnostico.sugestaoClassificacao,
  };
}

/**
 * Variante estendida de classificacao usada por telas/rotinas de diagnostico.
 *
 * Mantem o mesmo funil da funcao classificar, adicionando metadados para
 * facilitar explicacao do resultado ao usuario.
 */
export function classificarComDiagnostico(
  descricao: string,
  regras: Regra[],
  dataTransacao?: Date,
  valorAbsoluto?: number,
  tipoTransacao?: 'entrada' | 'saida',
): ResultadoClassificacaoDiagnostico {
  const descNorm = normalizeForMatching(descricao, { removerStopwordsBancarias: true });

  const regraCorrespondente = encontrarPrimeiraRegraCorrespondente(descNorm, regras);

  if (regraCorrespondente) {
    return {
      classificacao: regraCorrespondente.categoria as Classificacao,
      categoriaGenerica: regraCorrespondente.subCategoria ?? null,
      sugestaoClassificacao: null,
      mecanismo: 'REGRA_EXPLICITA',
      confianca: 10,
      regraAplicada: regraCorrespondente.palavraChave,
      detalhes: `Correspondencia por palavra-chave: ${regraCorrespondente.palavraChave}`,
    };
  }

  const direcao = tipoTransacao ?? 'saida';
  const valor = valorAbsoluto ?? 0;

  if (contemPix(descricao)) {
    const heuristicaPix = classificarPixComHeuristica(descricao, valor, direcao);
    if (heuristicaPix.classificacao !== 'INDEFINIDO') {
      return {
        classificacao: heuristicaPix.classificacao,
        categoriaGenerica: null,
        sugestaoClassificacao: null,
        mecanismo: 'HEURISTICA_PIX',
        confianca: heuristicaPix.confianca,
        regraAplicada: null,
        detalhes: `Classificacao por heuristica PIX (confianca ${heuristicaPix.confianca}).`,
      };
    }
  } else {
    const heuristicaNaoPix = classificarNaoPixComHeuristica(descricao, valor, direcao);
    if (heuristicaNaoPix.classificacao !== 'INDEFINIDO') {
      return {
        classificacao: heuristicaNaoPix.classificacao,
        categoriaGenerica: null,
        sugestaoClassificacao: null,
        mecanismo: 'HEURISTICA_NAO_PIX',
        confianca: heuristicaNaoPix.confianca,
        regraAplicada: null,
        detalhes: `Classificacao por heuristica nao-PIX (confianca ${heuristicaNaoPix.confianca}).`,
      };
    }
  }

  return {
    classificacao: 'INDEFINIDO',
    categoriaGenerica: null,
    sugestaoClassificacao: null,
    mecanismo: 'FALLBACK',
    confianca: 0,
    regraAplicada: null,
    detalhes: 'Nenhuma regra ou heuristica atingiu confianca minima.',
  };
}
