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
  observacao?: string;
  arquivoOrigem?: string;
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
