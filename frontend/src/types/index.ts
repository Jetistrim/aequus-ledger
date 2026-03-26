export type Classificacao = 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
export type Tipo = 'ENTRADA' | 'SAIDA';
export type Categoria = 'PESSOAL' | 'EMPRESA';
export type FormatoExportacao = 'csv' | 'xlsx';

export interface Transacao {
  id: string;
  dataTransacao: string; // ISO date string
  descricao: string;
  valor: number;
  tipo: Tipo;
  classificacao: Classificacao;
  categoriaGenerica?: string | null;
  hashTransacao: string;
  codigoReferencia?: string | null;
  identificador: string;
  arquivoOrigem?: string;
  /**
   * Campo computado pela API para sinalização técnica de PIX classificado.
   * Não representa revisão manual pendente na UI.
   */
  pixAutoClassificado?: boolean;
  /**
   * Sugestão heurística disponível apenas para alguns PIX ainda indefinidos.
   */
  sugestaoClassificacao?: 'PESSOAL' | 'EMPRESA' | null;
  /**
   * Texto auxiliar explicando a heurística aplicada à sugestão de classificação.
   */
  labelHeuristica?: string | null;
}

export interface Regra {
  id: number;
  palavraChave: string;
  categoria: Categoria;
  subCategoria?: string | null;
  prioridade: number;
}

export interface RespostaUpload {
  importadas: number;
  duplicadas: number;
  indefinidas: number;
  transacoes: Transacao[];
}

export interface TotaisTransacoes {
  pessoal: number;
  empresa: number;
  total: number;
  indefinidos: number;
}

export interface PaginacaoTransacoes {
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  limite: number;
}

export interface RespostaListagemTransacoes {
  dados: Transacao[];
  paginacao: PaginacaoTransacoes;
  totais: TotaisTransacoes;
}

export type ModoTesteRegras = 'SALVAS' | 'TEMPORARIAS' | 'AMBAS';
export type OrigemAmostrasDiagnostico = 'MANUAL' | 'BANCO_INDEFINIDAS' | 'MISTO';
export type MecanismoClassificacaoDiagnostico =
  | 'REGRA_EXPLICITA'
  | 'HEURISTICA_PIX'
  | 'HEURISTICA_NAO_PIX'
  | 'FALLBACK';

export interface RegraTemporariaTeste {
  palavraChave: string;
  categoria: Categoria;
  subCategoria?: string;
  prioridade?: number;
}

export interface AmostraManualDiagnostico {
  descricao: string;
  valor: number;
  tipo: Tipo;
  dataTransacao?: string;
}

export interface RequisicaoTesteRegras {
  modoRegras: ModoTesteRegras;
  regrasTemporarias?: RegraTemporariaTeste[];
  usarIndefinidasBanco?: boolean;
  filtroClassificacaoBanco?: 'TODAS' | 'INDEFINIDO' | 'PESSOAL' | 'EMPRESA';
  limiteAmostras?: number;
  amostrasManuais?: AmostraManualDiagnostico[];
}

export interface FaixaValorDiagnostico {
  faixaValor: '< R$100' | 'R$100-500' | 'R$500-1k' | 'R$1k-5k' | '> R$5k';
  quantidade: number;
  valorMedio: number;
  valorMinimo: number;
  valorMaximo: number;
}

export interface TopDescricaoDiagnostico {
  descricaoResumida: string;
  quantidade: number;
  valorMedio: number;
}

export interface ResumoClassificacaoDiagnostico {
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
  mecanismo: MecanismoClassificacaoDiagnostico;
  confianca: number;
  regraAplicada: string | null;
  detalhes: string;
}

export interface RespostaTesteRegras {
  modoRegras: ModoTesteRegras;
  totalAmostras: number;
  origemAmostras: OrigemAmostrasDiagnostico;
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
