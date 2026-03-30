import { normalizeForMatching } from '../utils/normalization';
import { DirecaoTransacao, ResultadoHeuristica } from './heuristicaCommon';

const TOKENS_NAO_PIX_GATILHO = [
  'DEBITO',
  'JUROS',
  'IOF',
  'MULTA',
  'VISA',
  'VISA ELECTRON',
  'MASTERCARD',
  'CARTAO',
  'BOLETO',
  'TARIFA',
  'MENSALIDADE',
  'CONVENIENCIA',
  'SUPERMERCA',
];

const TOKENS_NAO_PIX_PESSOAL = [
  'SUPERMERCA',
  'CONVENIENCIA',
  'FARMACIA',
  'DROGARIA',
  'BEBELU',
  'HIPERSENNA',
  'RIO GRANDE',
];

const TOKENS_NAO_PIX_EMPRESA = [
  'TARIFA',
  'MENSALIDADE',
  'BOLETO',
  'ASSESSORIA',
  'DISTRIBUIDORA',
  'JUROS',
  'IOF',
  'MULTA MORATORIA',
  'JUROS DE MORA',
  'PAGAMENTO CARTAO CREDITO',
  'CARTAO CREDITO BCE',
  'PJBANK PAGAMENTOS',
  'GRADUATI INTEGRACAO',
];

function contemAlgumToken(descricao: string, tokens: string[]): boolean {
  return tokens.some((token) => descricao.includes(token));
}

/**
 * Para descrições longas de débito/cartão, tenta isolar o merchant no final
 * removendo prefixos bancários comuns.
 */
function extrairCaudaMerchant(descricao: string): string {
  const semPrefixoDebito = descricao
    .replace(/^DEBITO\s+VISA\s+ELECTRON\s+BRASIL\s+\d{2}\/\d{2}\s+/i, '')
    .replace(/^DEBITO\s+VISA\s+ELECTRON\s+BRASIL\s+/i, '')
    .replace(/^PAGAMENTO\s+CARTAO\s+CREDITO\s+BCE\s+\d{2}\/\d{2}\s+\d{2}:\d{2}\s+CARTAO\s+VISA\s*/i, '')
    .trim();

  return semPrefixoDebito || descricao;
}

/**
 * Aplica heuristica leve para transacoes NAO-PIX com sinais de debito/cartao.
 *
 * Esta heuristica e propositalmente conservadora: so classifica quando ha vantagem
 * clara de score para reduzir erro em despesas operacionais pequenas.
 */
export function classificarNaoPixComHeuristica(
  descricaoOriginal: string,
  valor: number,
  tipo: DirecaoTransacao,
): ResultadoHeuristica {
  const descricao = normalizeForMatching(descricaoOriginal, { removerStopwordsBancarias: false });
  const merchantTail = extrairCaudaMerchant(descricao);
  const alvo = `${descricao} ${merchantTail}`;

  if (!contemAlgumToken(alvo, TOKENS_NAO_PIX_GATILHO)) {
    return { classificacao: 'INDEFINIDO', confianca: 0 };
  }

  let pontosEmpresa = 0;
  let pontosPessoal = 0;

  const temTokenPessoal = contemAlgumToken(alvo, TOKENS_NAO_PIX_PESSOAL);
  const temTokenEmpresa = contemAlgumToken(alvo, TOKENS_NAO_PIX_EMPRESA);

  if (temTokenEmpresa) {
    pontosEmpresa += 3;
  }

  if (temTokenPessoal) {
    pontosPessoal += 2;
  }

  if (tipo === 'entrada') {
    pontosEmpresa += 1;
  }

  if (valor < 80 && temTokenPessoal && !temTokenEmpresa) {
    pontosPessoal += 1;
  }

  if (valor > 500 && (valor % 100 === 0 || valor % 500 === 0)) {
    pontosEmpresa += 1;
  }

  if (pontosEmpresa > pontosPessoal + 1) {
    return { classificacao: 'EMPRESA', confianca: Math.min(10, pontosEmpresa) };
  }

  if (pontosPessoal > pontosEmpresa + 1) {
    return { classificacao: 'PESSOAL', confianca: Math.min(10, pontosPessoal) };
  }

  return { classificacao: 'INDEFINIDO', confianca: 0 };
}
