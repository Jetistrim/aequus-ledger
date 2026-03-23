import { Classificacao, Transacao } from '../types';

const corLinha: Record<Classificacao, string> = {
  PESSOAL: 'bg-green-50 border-l-4 border-green-400',
  EMPRESA: 'bg-blue-50 border-l-4 border-blue-400',
  INDEFINIDO: 'bg-red-50 border-l-4 border-red-400',
};

/**
 * Define quando a linha deve exibir a tag de revisão manual.
 *
 * @remarks
 * A revisão manual é representada apenas por transações ainda indefinidas.
 * Campos computados como `pixAutoClassificado` não devem dirigir esse estado visual.
 */
export function shouldShowReviewTag(
  transacao: Pick<Transacao, 'classificacao'>,
): boolean {
  return transacao.classificacao === 'INDEFINIDO';
}

/**
 * Resolve a classe visual base da linha a partir da classificação persistida.
 */
export function getLinhaClassName(
  transacao: Pick<Transacao, 'classificacao'>,
): string {
  return corLinha[transacao.classificacao];
}
