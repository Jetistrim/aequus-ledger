import { describe, expect, it } from 'vitest';
import { classificarNaoPixComHeuristica } from '../src/services/heuristicaNaoPixService';

describe('heuristicaNaoPixService', () => {
  it('classifica encargos bancarios como EMPRESA', () => {
    const resultado = classificarNaoPixComHeuristica(
      'JUROS DE MORA - ATRASO PERIODO: 01/02 A 28/02/26',
      17.01,
      'saida',
    );
    expect(resultado.classificacao).toBe('EMPRESA');
  });

  it('classifica pagamento de cartao credito como EMPRESA', () => {
    const resultado = classificarNaoPixComHeuristica(
      'PAGAMENTO CARTAO CREDITO BCE 27/02 21:39 CARTAO VISA',
      500,
      'saida',
    );
    expect(resultado.classificacao).toBe('EMPRESA');
  });

  it('classifica debito em merchant alimentar recorrente como PESSOAL', () => {
    const resultado = classificarNaoPixComHeuristica(
      'DEBITO VISA ELECTRON BRASIL 25/02 BEBELU SANDUICHES',
      40.9,
      'saida',
    );
    expect(resultado.classificacao).toBe('PESSOAL');
  });

  it('mantem INDEFINIDO para descricao sem gatilho nao-pix', () => {
    const resultado = classificarNaoPixComHeuristica('TRANSFERENCIA DIVERSA', 120, 'saida');
    expect(resultado.classificacao).toBe('INDEFINIDO');
  });
});
