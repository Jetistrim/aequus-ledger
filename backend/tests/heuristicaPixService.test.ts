import { describe, expect, it } from 'vitest';
import { classificarPixComHeuristica } from '../src/services/heuristicaPixService';
import { classificarNaoPixComHeuristica } from '../src/services/heuristicaNaoPixService';

describe('heuristicaPixService', () => {
  it('classifica PIX de saida para token forte pessoal (99) como PESSOAL', () => {
    const resultado = classificarPixComHeuristica('PIX ENVIADO 99 TECNOLOGIA LTDA', 22.4, 'saida');
    expect(resultado.classificacao).toBe('PESSOAL');
  });

  it('classifica PIX de saida para token forte empresa (NU PAGAMENTOS) como EMPRESA', () => {
    const resultado = classificarPixComHeuristica('PIX ENVIADO NU PAGAMENTOS S A', 1200, 'saida');
    expect(resultado.classificacao).toBe('EMPRESA');
  });

  it('reconhece PF com conectivo e favorece pessoal em saida', () => {
    const resultado = classificarPixComHeuristica('PIX ENVIADO Janaiane de Jesus Milesi', 75.2, 'saida');
    expect(resultado.classificacao).toBe('PESSOAL');
  });

  it('usa tokens de nicho para classificar empresa', () => {
    const resultado = classificarPixComHeuristica('PIX ENVIADO MAXSAUDE DISTRIBUIDORA DE PRODUTOS ODONTOLOGICOS', 780, 'saida');
    expect(resultado.classificacao).toBe('EMPRESA');
  });

  it('retorna INDEFINIDO quando score e fraco/empatado', () => {
    const resultado = classificarPixComHeuristica('PIX ENVIADO ALGUEM', 120, 'saida');
    expect(resultado.classificacao).toBe('INDEFINIDO');
  });

  it('classifica nao-PIX de debito supermercado como pessoal', () => {
    const resultado = classificarNaoPixComHeuristica('DEBITO VISA ELECTRON BRASIL MATEUS SUPERMERCA', 34.41, 'saida');
    expect(resultado.classificacao).toBe('PESSOAL');
  });

  it('classifica nao-PIX de tarifa como empresa', () => {
    const resultado = classificarNaoPixComHeuristica('TARIFA MENSALIDADE PACOTE SERVICOS JANEIRO', 16.1, 'saida');
    expect(resultado.classificacao).toBe('EMPRESA');
  });
});
