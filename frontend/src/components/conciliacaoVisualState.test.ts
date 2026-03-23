import { describe, expect, it } from 'vitest';
import { getLinhaClassName, shouldShowReviewTag } from './conciliacaoVisualState';

describe('conciliacaoVisualState', () => {
  it('marca em revisão apenas transações indefinidas', () => {
    expect(shouldShowReviewTag({ classificacao: 'INDEFINIDO' })).toBe(true);
    expect(shouldShowReviewTag({ classificacao: 'PESSOAL' })).toBe(false);
    expect(shouldShowReviewTag({ classificacao: 'EMPRESA' })).toBe(false);
  });

  it('usa a cor base da classificação persistida', () => {
    expect(getLinhaClassName({ classificacao: 'PESSOAL' })).toContain('border-green-400');
    expect(getLinhaClassName({ classificacao: 'EMPRESA' })).toContain('border-blue-400');
    expect(getLinhaClassName({ classificacao: 'INDEFINIDO' })).toContain('border-red-400');
  });
});
