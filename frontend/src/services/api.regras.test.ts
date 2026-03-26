import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  getMock: vi.fn(),
  patchMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      post: mocks.postMock,
      delete: mocks.deleteMock,
      get: mocks.getMock,
      patch: mocks.patchMock,
      put: mocks.putMock,
    }),
    isAxiosError: (value: unknown) => Boolean((value as { isAxiosError?: boolean })?.isAxiosError),
  },
}));

import { testarRegras } from './api';

describe('api regras - teste de diagnostico', () => {
  beforeEach(() => {
    mocks.postMock.mockReset();
  });

  it('envia payload para /regras/teste e retorna resposta tipada', async () => {
    mocks.postMock.mockResolvedValueOnce({
      data: {
        modoRegras: 'AMBAS',
        totalAmostras: 1,
        origemAmostras: 'MANUAL',
        resumoIndefinidas: {
          quantidadeTotal: 1,
          quantidadePix: 1,
          quantidadeNaoPix: 0,
          percentualPix: 100,
          percentualNaoPix: 0,
        },
        pixPorFaixaValor: [],
        naoPixPorFaixaValor: [],
        topDescricoesPix: [],
        topDescricoesNaoPix: [],
        resumoClassificacaoAtual: {
          totalTransacoes: 1,
          pessoal: 0,
          empresa: 0,
          indefinido: 1,
          percentualIndefinido: 100,
        },
        resumoClassificacaoTeste: {
          totalTransacoes: 1,
          pessoal: 1,
          empresa: 0,
          indefinido: 0,
          percentualIndefinido: 0,
        },
        resultados: [],
      },
    });

    const response = await testarRegras({
      modoRegras: 'AMBAS',
      usarIndefinidasBanco: false,
      amostrasManuais: [{ descricao: 'PIX ENVIADO IFOOD', valor: 10, tipo: 'SAIDA' }],
    });

    expect(mocks.postMock).toHaveBeenCalledWith('/regras/teste', {
      modoRegras: 'AMBAS',
      usarIndefinidasBanco: false,
      amostrasManuais: [{ descricao: 'PIX ENVIADO IFOOD', valor: 10, tipo: 'SAIDA' }],
    });
    expect(response.modoRegras).toBe('AMBAS');
  });

  it('normaliza erro de API para ApiRequestError', async () => {
    mocks.postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          erro: 'Payload inválido.',
          codigo: 'VALIDATION_ERROR',
          detalhes: [{ campo: 'payload', mensagem: 'Informe amostras.' }],
        },
      },
    });

    await expect(
      testarRegras({ modoRegras: 'SALVAS' }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiRequestError',
        message: 'Payload inválido.',
        code: 'VALIDATION_ERROR',
        details: [{ campo: 'payload', mensagem: 'Informe amostras.' }],
      }),
    );
  });
});
