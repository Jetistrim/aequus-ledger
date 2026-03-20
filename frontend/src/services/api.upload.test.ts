import { describe, expect, it, vi, beforeEach } from 'vitest';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: () => ({
      post: postMock,
      get: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }),
  },
}));

import { uploadArquivo, uploadArquivos } from './api';

describe('api upload from frontend', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('envia FormData com campo arquivos para upload múltiplo', async () => {
    postMock.mockResolvedValue({
      data: {
        importadas: 2,
        duplicadas: 0,
        indefinidas: 0,
        transacoes: [],
      },
    });

    const arquivo1 = new File(['linha1'], 'extrato1.csv', { type: 'text/csv' });
    const arquivo2 = new File(['linha2'], 'extrato2.xls', { type: 'application/vnd.ms-excel' });

    const resposta = await uploadArquivos([arquivo1, arquivo2]);

    expect(postMock).toHaveBeenCalledTimes(1);

    const [url, body, config] = postMock.mock.calls[0] as [string, FormData, { headers: Record<string, string> }];

    expect(url).toBe('/upload');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const arquivos = body.getAll('arquivos') as File[];
    expect(arquivos).toHaveLength(2);
    expect(arquivos[0].name).toBe('extrato1.csv');
    expect(arquivos[1].name).toBe('extrato2.xls');

    expect(resposta.importadas).toBe(2);
  });

  it('usa a mesma premissa no upload unitário (wrapper de um arquivo)', async () => {
    postMock.mockResolvedValue({
      data: {
        importadas: 1,
        duplicadas: 0,
        indefinidas: 0,
        transacoes: [],
      },
    });

    const arquivo = new File(['conteudo'], 'extrato.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const resposta = await uploadArquivo(arquivo);

    expect(postMock).toHaveBeenCalledTimes(1);
    const [, body] = postMock.mock.calls[0] as [string, FormData];
    const arquivos = body.getAll('arquivos') as File[];
    expect(arquivos).toHaveLength(1);
    expect(arquivos[0].name).toBe('extrato.xlsx');
    expect(resposta.importadas).toBe(1);
  });
});
