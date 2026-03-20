import { describe, expect, it } from 'vitest';
import { normalizeForMatching } from '../src/utils/normalization';

describe('normalization', () => {
  it('remove frases e tokens de PIX para matching', () => {
    expect(normalizeForMatching('PAGAMENTO VIA PIX JOAO SILVA')).toBe('JOAO SILVA');
    expect(normalizeForMatching('PIX RECEBIDO FORNECEDOR ACME')).toBe('FORNECEDOR ACME');
  });

  it('preserva termos quando remoção de stopwords está desabilitada', () => {
    expect(normalizeForMatching('PIX RECEBIDO JOAO', { removerStopwordsBancarias: false })).toBe('PIX RECEBIDO JOAO');
  });
});
