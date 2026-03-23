import { describe, expect, it } from 'vitest';
import { classificar, type Regra } from '../src/services/classificadorService';

const regrasBase: Regra[] = [
  {
    palavraChave: 'IFOOD,RAPPI',
    categoria: 'PESSOAL',
    subCategoria: 'Alimentacao',
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
  it('prioriza regra explicita antes da heuristica', () => {
    expect(classificar('PIX ENVIADO IFOOD', regrasBase, undefined, 50, 'saida')).toEqual({
      classificacao: 'PESSOAL',
      categoriaGenerica: 'Alimentacao',
      sugestaoClassificacao: null,
    });
  });

  it('classifica PIX sem regra usando heuristica', () => {
    expect(classificar('PIX ENVIADO Janaiane de Jesus Milesi', regrasBase, undefined, 75.2, 'saida')).toEqual({
      classificacao: 'PESSOAL',
      categoriaGenerica: null,
      sugestaoClassificacao: null,
    });
  });

  it('classifica nao-PIX de debito/cartao usando heuristica nao-pix', () => {
    expect(classificar('DEBITO VISA ELECTRON BRASIL MATEUS SUPERMERCA', regrasBase, undefined, 34.41, 'saida')).toEqual({
      classificacao: 'PESSOAL',
      categoriaGenerica: null,
      sugestaoClassificacao: null,
    });
  });

  it('mantem INDEFINIDO quando sem regra e sem sinais fortes', () => {
    expect(classificar('TRANSFERENCIA DIVERSA', regrasBase, undefined, 120, 'saida')).toEqual({
      classificacao: 'INDEFINIDO',
      categoriaGenerica: null,
      sugestaoClassificacao: null,
    });
  });
});
