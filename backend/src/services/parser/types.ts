export interface TransacaoRaw {
  dataTransacao: Date;
  descricao: string;
  valor: number;
  arquivoOrigem: string;
}

export interface ColunasTransacao {
  dataKey?: string;
  descKey?: string;
  valorKey?: string;
  creditoKey?: string;
  debitoKey?: string;
}
