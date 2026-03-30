import { normalizeForMatching } from '../utils/normalization';
import { DirecaoTransacao, ResultadoHeuristica } from './heuristicaCommon';

export interface SugestaoHeuristica {
  sugestao: 'PESSOAL' | 'EMPRESA' | null;
  label: string | null;
}

const CONECTIVOS_NOME = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E']);
const TOKENS_OPERACIONAIS_PF = new Set(['PIX', 'ENVIADO', 'RECEBIDO', 'DEVOLVIDO', 'TRANSFERENCIA', 'TRANSF', 'PAGAMENTO']);

const TOKENS_EMPRESA_BASE = [
  'LTDA',
  'S A',
  'S.A',
  'S/A',
  'ME',
  'EIRELI',
  'SERVICOS',
  'COMERCIO',
  'INSTITUTO',
  'TECNOLOGIA',
  'PAGAMENTOS',
  'BANCO',
  'NU PAGAMENTOS',
];

const TOKENS_PESSOAL_DIRETO = ['99 TECNOLOGIA', 'UBER'];
const TOKENS_EMPRESA_DIRETO = ['NU PAGAMENTOS', 'SANTANDER', 'BOLETO'];

function contemAlgumToken(descricao: string, tokens: string[]): boolean {
  return tokens.some((token) => descricao.includes(token));
}

/**
 * Detecta se a descricao se parece com nome de pessoa fisica.
 *
 * Remove conectivos e termos operacionais (PIX/ENVIADO/RECEBIDO etc.)
 * e exige pelo menos dois tokens alfabeticos restantes.
 */
function pareceNomePessoaFisica(descricaoNormalizada: string): boolean {
  const tokens = descricaoNormalizada
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((token) => !CONECTIVOS_NOME.has(token))
    .filter((token) => !TOKENS_OPERACIONAIS_PF.has(token))
    .filter((token) => /^[A-Z]+$/.test(token));

  return tokens.length >= 2;
}

/**
 * Aplica heuristica de classificacao para transacoes PIX sem regra explicita.
 *
 * Ordem de sinais:
 * 1. Tokens fortes de pessoal/empresa por contraparte
 * 2. Tokens corporativos gerais
 * 3. Sinal de nome PF combinado com direção da transação
 * 4. Desempate por faixa/formato de valor
 *
 * Em caso de empate ou score fraco, retorna INDEFINIDO para evitar falso positivo.
 */
export function classificarPixComHeuristica(
  descricaoOriginal: string,
  valor: number,
  tipo: DirecaoTransacao,
): ResultadoHeuristica {
  const descricao = normalizeForMatching(descricaoOriginal, { removerStopwordsBancarias: false });

  let pontosEmpresa = 0;
  let pontosPessoal = 0;

  const temTokenEmpresaBase = contemAlgumToken(descricao, TOKENS_EMPRESA_BASE);

  if (tipo === 'saida' && contemAlgumToken(descricao, TOKENS_PESSOAL_DIRETO)) {
    pontosPessoal += 3;
  }

  if (tipo === 'saida' && contemAlgumToken(descricao, TOKENS_EMPRESA_DIRETO)) {
    pontosEmpresa += 3;
  }

  if (temTokenEmpresaBase) {
    pontosEmpresa += 3;
  }

  const nomePessoaFisica = !temTokenEmpresaBase && pareceNomePessoaFisica(descricao);
  if (nomePessoaFisica) {
    if (tipo === 'saida') {
      pontosPessoal += 2;
    }
    if (tipo === 'entrada') {
      pontosEmpresa += 3;
    }
  }

  if (valor < 50) {
    pontosPessoal += 2;
  } else if (valor < 100) {
    pontosPessoal += 1;
  }

  if (valor > 500 && (valor % 100 === 0 || valor % 500 === 0)) {
    pontosEmpresa += 2;
  }

  const valorQuebrado = Math.round(valor * 100) % 100 !== 0;
  if (valorQuebrado) {
    pontosPessoal += 1;
  }

  if (pontosEmpresa > pontosPessoal + 1) {
    return { classificacao: 'EMPRESA', confianca: Math.min(10, pontosEmpresa) };
  }

  if (pontosPessoal > pontosEmpresa + 1) {
    return { classificacao: 'PESSOAL', confianca: Math.min(10, pontosPessoal) };
  }

  return { classificacao: 'INDEFINIDO', confianca: 0 };
}

/**
 * Compatibilidade para chamadas legadas.
 *
 * Mantem a assinatura antiga para evitar quebra de importacoes. O parametro de data
 * nao e usado pela heuristica atual.
 */
export function sugerirPorHeuristica(_: Date, valorAbsoluto: number): SugestaoHeuristica {
  const resultado = classificarPixComHeuristica('PIX', valorAbsoluto, 'saida');
  if (resultado.classificacao === 'INDEFINIDO') {
    return { sugestao: null, label: null };
  }
  return { sugestao: resultado.classificacao, label: `Confianca ${resultado.confianca}` };
}
