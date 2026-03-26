import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRegras } from './useRegras';

const apiMock = vi.hoisted(() => ({
  listarRegras: vi.fn(),
  criarRegra: vi.fn(),
  atualizarRegra: vi.fn(),
  deletarRegra: vi.fn(),
  formatApiErrorMessage: vi.fn(),
}));

vi.mock('../services/api', () => apiMock);

describe('useRegras', () => {
  beforeEach(() => {
    apiMock.listarRegras.mockReset();
    apiMock.criarRegra.mockReset();
    apiMock.atualizarRegra.mockReset();
    apiMock.deletarRegra.mockReset();
    apiMock.formatApiErrorMessage.mockReset();
    apiMock.formatApiErrorMessage.mockImplementation((_err: unknown, fallback: string) => fallback);
  });

  it('carrega regras ao montar e mantém ordenação por prioridade no create', async () => {
    // Este cenário evita regressão no fluxo principal da tela de regras: bootstrap + inclusão ordenada.
    apiMock.listarRegras.mockResolvedValueOnce([
      { id: 1, palavraChave: 'Z', categoria: 'PESSOAL', prioridade: 2, subCategoria: null },
      { id: 2, palavraChave: 'A', categoria: 'EMPRESA', prioridade: 1, subCategoria: null },
    ]);

    apiMock.criarRegra.mockResolvedValueOnce({
      id: 3,
      palavraChave: 'NOVA',
      categoria: 'PESSOAL',
      prioridade: 0,
      subCategoria: 'Teste',
    });

    const { result } = renderHook(() => useRegras());

    await waitFor(() => {
      expect(result.current.regras).toHaveLength(2);
    });

    await act(async () => {
      await result.current.criar({
        palavraChave: 'NOVA',
        categoria: 'PESSOAL',
        prioridade: 0,
        subCategoria: 'Teste',
      });
    });

    expect(result.current.regras.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('atualiza uma regra sem perder itens já carregados', async () => {
    apiMock.listarRegras.mockResolvedValueOnce([
      { id: 11, palavraChave: 'IFOOD', categoria: 'PESSOAL', prioridade: 1, subCategoria: null },
    ]);

    apiMock.atualizarRegra.mockResolvedValueOnce({
      id: 11,
      palavraChave: 'IFOOD,RAPPI',
      categoria: 'PESSOAL',
      prioridade: 1,
      subCategoria: 'Alimentação',
    });

    const { result } = renderHook(() => useRegras());

    await waitFor(() => {
      expect(result.current.regras[0]?.palavraChave).toBe('IFOOD');
    });

    await act(async () => {
      await result.current.atualizar(11, { palavraChave: 'IFOOD,RAPPI' });
    });

    expect(result.current.regras[0]?.palavraChave).toBe('IFOOD,RAPPI');
  });

  it('remove regra da lista no delete', async () => {
    apiMock.listarRegras.mockResolvedValueOnce([
      { id: 7, palavraChave: 'A', categoria: 'PESSOAL', prioridade: 1, subCategoria: null },
      { id: 8, palavraChave: 'B', categoria: 'EMPRESA', prioridade: 2, subCategoria: null },
    ]);
    apiMock.deletarRegra.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRegras());

    await waitFor(() => {
      expect(result.current.regras).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deletar(7);
    });

    expect(result.current.regras).toEqual([
      { id: 8, palavraChave: 'B', categoria: 'EMPRESA', prioridade: 2, subCategoria: null },
    ]);
  });

  it('propaga erro amigável quando carregar falha', async () => {
    apiMock.listarRegras.mockRejectedValueOnce(new Error('boom'));
    apiMock.formatApiErrorMessage.mockReturnValueOnce('Erro ao carregar regras.');

    const { result } = renderHook(() => useRegras());

    await waitFor(() => {
      expect(result.current.erro).toBe('Erro ao carregar regras.');
    });
  });
});
