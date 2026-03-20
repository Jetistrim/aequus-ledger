import { describe, expect, it } from 'vitest';
import { classificar, type Regra } from '../src/services/classificadorService';

const regrasBase: Regra[] = [
  {
    palavraChave: 'IFOOD,RAPPI',
    categoria: 'PESSOAL',
    subCategoria: 'Alimentação',
    prioridade: 1,
  },
  {
    palavraChave: 'PIX RECEBIDO,RECEBIMENTO CLIENTE,CLIENTE',
    categoria: 'EMPRESA',
    subCategoria: 'Receita',
    prioridade: 2,
  },
];

describe('classificadorService', () => {
  it('auto-classifica PIX com regra correspondente (sem forçar INDEFINIDO)', () => {
    expect(classificar('PIX ENVIADO IFOOD', regrasBase)).toEqual({
      classificacao: 'PESSOAL',
      categoriaGenerica: 'Alimentação',
      sugestaoClassificacao: null,
    });
  });

  it('mantém a classificação original para transações não PIX', () => {
    expect(classificar('COMPRA IFOOD', regrasBase)).toEqual({
      classificacao: 'PESSOAL',
      categoriaGenerica: 'Alimentação',
      sugestaoClassificacao: null,
    });
  });

  it('auto-classifica PIX de receita quando há regra correspondente', () => {
    expect(classificar('PIX RECEBIDO CLIENTE ACME', regrasBase)).toEqual({
      classificacao: 'EMPRESA',
      categoriaGenerica: 'Receita',
      sugestaoClassificacao: null,
    });
  });

  it('auto-classifica PIX com regra após normalização de frases compostas', () => {
    const regrasFornecedor: Regra[] = [
      {
        palavraChave: 'PAGAMENTO VIA PIX,FORNECEDOR',
        categoria: 'EMPRESA',
        subCategoria: 'Fornecedor',
        prioridade: 1,
      },
    ];

    expect(classificar('PAGAMENTO VIA PIX FORNECEDOR ACME', regrasFornecedor)).toEqual({
      classificacao: 'EMPRESA',
      categoriaGenerica: 'Fornecedor',
      sugestaoClassificacao: null,
    });
  });

  it('retorna INDEFINIDO com sugestão heurística para PIX sem regra correspondente', () => {
    // Domingo 22/03/2026 12:00 UTC = 09:00 BRT → fim de semana
    // Valor R$50 < R$100 → score PESSOAL: 2 (fim de semana) + 1 (valor baixo) = 3 ≥ threshold
    const dataDomingo = new Date('2026-03-22T15:00:00.000Z');

    expect(classificar('PIX ENVIADO JOAO SILVA', regrasBase, dataDomingo, 50)).toEqual({
      classificacao: 'INDEFINIDO',
      categoriaGenerica: null,
      sugestaoClassificacao: 'PESSOAL',
    });
  });
});