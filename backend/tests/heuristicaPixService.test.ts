import { describe, expect, it } from 'vitest';
import { sugerirPorHeuristica } from '../src/services/heuristicaPixService';

// 2026-03-21 (sábado) 15:00 UTC = 12:00 BRT → fim de semana
const SABADO_BRT = new Date('2026-03-21T18:00:00.000Z');
// 2026-03-20 (sexta) 22:00 BRT = 01:00 UTC sábado — deve continuar sendo sexta em BRT
const SEXTA_NOITE_BRT = new Date('2026-03-21T01:00:00.000Z');
// 2026-03-18 (quarta) 14:00 UTC = 11:00 BRT → dia útil
const QUARTA_BRT = new Date('2026-03-18T14:00:00.000Z');

describe('heuristicaPixService', () => {
  it('sugere PESSOAL para PIX em fim de semana (BRT)', () => {
    const resultado = sugerirPorHeuristica(SABADO_BRT, 200);
    expect(resultado.sugestao).toBe('PESSOAL');
    expect(resultado.label).toContain('Fim de semana');
  });

  it('corrige fuso: sexta às 22h BRT (01h UTC sábado) deve ser dia útil', () => {
    // Sexta às 22h BRT deve ser tratada como dia útil, não fim de semana
    // Sem outros sinais fortes, score EMPRESA +1 (dia útil) — abaixo do threshold
    // → sem sugestão
    const resultado = sugerirPorHeuristica(SEXTA_NOITE_BRT, 200);
    // Score: dia útil → EMPRESA +1. Sem mais sinais → abaixo do threshold (2)
    expect(resultado.sugestao).toBeNull();
  });

  it('sugere EMPRESA para valor alto arredondado em dia útil', () => {
    // Valor R$1000 (>= 500, múltiplo de 100) → EMPRESA +2; dia útil → EMPRESA +1 = 3
    const resultado = sugerirPorHeuristica(QUARTA_BRT, 1000);
    expect(resultado.sugestao).toBe('EMPRESA');
    expect(resultado.label).toContain('Valor alto arredondado');
  });

  it('retorna null para valor pequeno em dia útil (score abaixo do threshold)', () => {
    // R$50 < 100 → PESSOAL +1; dia útil → EMPRESA +1 — ambos abaixo do threshold
    const resultado = sugerirPorHeuristica(QUARTA_BRT, 50);
    expect(resultado.sugestao).toBeNull();
    expect(resultado.label).toBeNull();
  });

  it('sugere PESSOAL com labels combinados em fim de semana + valor baixo', () => {
    const resultado = sugerirPorHeuristica(SABADO_BRT, 45);
    expect(resultado.sugestao).toBe('PESSOAL');
    expect(resultado.label).toContain('Fim de semana');
    expect(resultado.label).toContain('Valor baixo');
  });
});
