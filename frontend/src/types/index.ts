export type Classificacao = 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
export type Tipo = 'ENTRADA' | 'SAIDA';
export type Categoria = 'PESSOAL' | 'EMPRESA';

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
  // Campos computados dinamicamente pela API (não persistidos)
  pixAutoClassificado?: boolean;
  sugestaoClassificacao?: 'PESSOAL' | 'EMPRESA' | null;
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
