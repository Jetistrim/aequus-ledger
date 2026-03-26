import { Classificacao, Tipo } from '@prisma/client';
import { classificarComDiagnostico, MecanismoClassificacao, Regra } from './classificadorService';
import { sanitizeTextInput } from '../utils/normalization';

export type ModoTesteRegras = 'SALVAS' | 'TEMPORARIAS' | 'AMBAS';

export interface AmostraDiagnosticoEntrada {
  descricao: string;
  valor: number;
  tipo: Tipo;
  dataTransacao?: Date;
  classificacaoOriginal?: Classificacao;
}

interface FaixaValorDiagnostico {
  faixaValor: '< R$100' | 'R$100-500' | 'R$500-1k' | 'R$1k-5k' | '> R$5k';
  quantidade: number;
  valorMedio: number;
  valorMinimo: number;
  valorMaximo: number;
}

interface TopDescricaoDiagnostico {
  descricaoResumida: string;
  quantidade: number;
  valorMedio: number;
}

interface ResumoClassificacaoDiagnostico {
  totalTransacoes: number;
  pessoal: number;
  empresa: number;
  indefinido: number;
  percentualIndefinido: number;
}

export interface ResultadoAmostraDiagnostico {
  indice: number;
  descricao: string;
  valor: number;
  tipo: Tipo;
  classificacaoOriginal: Classificacao | null;
  classificacaoTeste: Classificacao;
  categoriaGenerica: string | null;
  mecanismo: MecanismoClassificacao;
  confianca: number;
  regraAplicada: string | null;
  detalhes: string;
}

export interface ResultadoDiagnosticoRegras {
  modoRegras: ModoTesteRegras;
  totalAmostras: number;
  origemAmostras: 'MANUAL' | 'BANCO_INDEFINIDAS' | 'MISTO';
  resumoIndefinidas: {
    quantidadeTotal: number;
    quantidadePix: number;
    quantidadeNaoPix: number;
    percentualPix: number;
    percentualNaoPix: number;
  };
  pixPorFaixaValor: FaixaValorDiagnostico[];
  naoPixPorFaixaValor: FaixaValorDiagnostico[];
  topDescricoesPix: TopDescricaoDiagnostico[];
  topDescricoesNaoPix: TopDescricaoDiagnostico[];
  resumoClassificacaoAtual: ResumoClassificacaoDiagnostico;
  resumoClassificacaoTeste: ResumoClassificacaoDiagnostico;
  resultados: ResultadoAmostraDiagnostico[];
}

function faixaValor(valor: number): FaixaValorDiagnostico['faixaValor'] {
  if (valor < 100) return '< R$100';
  if (valor < 500) return 'R$100-500';
  if (valor < 1000) return 'R$500-1k';
  if (valor < 5000) return 'R$1k-5k';
  return '> R$5k';
}

function arredondar(valor: number): number {
  return Number(valor.toFixed(2));
}

function agruparFaixas(rows: { valor: number }[]): FaixaValorDiagnostico[] {
  const buckets = new Map<FaixaValorDiagnostico['faixaValor'], number[]>();

  for (const row of rows) {
    const faixa = faixaValor(Math.abs(row.valor));
    const lista = buckets.get(faixa) ?? [];
    lista.push(Math.abs(row.valor));
    buckets.set(faixa, lista);
  }

  const ordem: FaixaValorDiagnostico['faixaValor'][] = ['< R$100', 'R$100-500', 'R$500-1k', 'R$1k-5k', '> R$5k'];

  return ordem
    .filter((faixa) => (buckets.get(faixa)?.length ?? 0) > 0)
    .map((faixa) => {
      const valores = buckets.get(faixa) ?? [];
      const total = valores.reduce((acc, cur) => acc + cur, 0);
      return {
        faixaValor: faixa,
        quantidade: valores.length,
        valorMedio: arredondar(total / valores.length),
        valorMinimo: arredondar(Math.min(...valores)),
        valorMaximo: arredondar(Math.max(...valores)),
      };
    });
}

function topDescricoes(rows: { descricao: string; valor: number }[]): TopDescricaoDiagnostico[] {
  const porDescricao = new Map<string, number[]>();

  for (const row of rows) {
    const descricao = sanitizeTextInput(row.descricao);
    const lista = porDescricao.get(descricao) ?? [];
    lista.push(Math.abs(row.valor));
    porDescricao.set(descricao, lista);
  }

  return [...porDescricao.entries()]
    .map(([descricao, valores]) => ({
      descricaoResumida: descricao.slice(0, 60),
      quantidade: valores.length,
      valorMedio: arredondar(valores.reduce((acc, cur) => acc + cur, 0) / valores.length),
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 15);
}

function calcularResumoClassificacao(classificacoes: Classificacao[]): ResumoClassificacaoDiagnostico {
  const total = classificacoes.length;
  const pessoal = classificacoes.filter((item) => item === 'PESSOAL').length;
  const empresa = classificacoes.filter((item) => item === 'EMPRESA').length;
  const indefinido = classificacoes.filter((item) => item === 'INDEFINIDO').length;

  return {
    totalTransacoes: total,
    pessoal,
    empresa,
    indefinido,
    percentualIndefinido: total > 0 ? arredondar((indefinido * 100) / total) : 0,
  };
}

function montarRegrasAtivas(
  modoRegras: ModoTesteRegras,
  regrasSalvas: Regra[],
  regrasTemporarias: Regra[],
): Regra[] {
  if (modoRegras === 'SALVAS') {
    return [...regrasSalvas];
  }

  if (modoRegras === 'TEMPORARIAS') {
    return [...regrasTemporarias];
  }

  // Em modo combinado, as temporarias entram primeiro para priorizar ajuste em tempo real.
  return [...regrasTemporarias, ...regrasSalvas];
}

/**
 * Executa diagnostico de regras em um conjunto de amostras e retorna agregacoes
 * no mesmo formato de leitura do script de diagnostico local.
 */
export function diagnosticarRegras(
  amostras: AmostraDiagnosticoEntrada[],
  modoRegras: ModoTesteRegras,
  regrasSalvas: Regra[],
  regrasTemporarias: Regra[],
  origemAmostras: ResultadoDiagnosticoRegras['origemAmostras'],
): ResultadoDiagnosticoRegras {
  const regrasAtivas = montarRegrasAtivas(modoRegras, regrasSalvas, regrasTemporarias);

  const resultados = amostras.map((amostra, indice) => {
    const descricao = sanitizeTextInput(amostra.descricao);
    const valorAbsoluto = Math.abs(amostra.valor);
    const tipoNormalizado = amostra.tipo === 'ENTRADA' ? 'entrada' : 'saida';

    const resultadoTeste = classificarComDiagnostico(
      descricao,
      regrasAtivas,
      amostra.dataTransacao,
      valorAbsoluto,
      tipoNormalizado,
    );

    return {
      indice,
      descricao,
      valor: valorAbsoluto,
      tipo: amostra.tipo,
      classificacaoOriginal: amostra.classificacaoOriginal ?? null,
      classificacaoTeste: resultadoTeste.classificacao,
      categoriaGenerica: resultadoTeste.categoriaGenerica,
      mecanismo: resultadoTeste.mecanismo,
      confianca: resultadoTeste.confianca,
      regraAplicada: resultadoTeste.regraAplicada,
      detalhes: resultadoTeste.detalhes,
    } satisfies ResultadoAmostraDiagnostico;
  });

  const pix = resultados.filter((row) => row.descricao.toUpperCase().includes('PIX'));
  const naoPix = resultados.filter((row) => !row.descricao.toUpperCase().includes('PIX'));

  return {
    modoRegras,
    totalAmostras: resultados.length,
    origemAmostras,
    resumoIndefinidas: {
      quantidadeTotal: resultados.length,
      quantidadePix: pix.length,
      quantidadeNaoPix: naoPix.length,
      percentualPix: resultados.length > 0 ? arredondar((pix.length * 100) / resultados.length) : 0,
      percentualNaoPix: resultados.length > 0 ? arredondar((naoPix.length * 100) / resultados.length) : 0,
    },
    pixPorFaixaValor: agruparFaixas(pix),
    naoPixPorFaixaValor: agruparFaixas(naoPix),
    topDescricoesPix: topDescricoes(pix),
    topDescricoesNaoPix: topDescricoes(naoPix),
    resumoClassificacaoAtual: calcularResumoClassificacao(
      resultados.map((row) => row.classificacaoOriginal ?? 'INDEFINIDO'),
    ),
    resumoClassificacaoTeste: calcularResumoClassificacao(
      resultados.map((row) => row.classificacaoTeste),
    ),
    resultados,
  };
}
