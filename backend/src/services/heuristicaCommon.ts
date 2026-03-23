export interface ResultadoHeuristica {
  classificacao: 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
  confianca: number;
}

export type DirecaoTransacao = 'entrada' | 'saida';
