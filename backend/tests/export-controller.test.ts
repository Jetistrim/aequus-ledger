import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gerarExtratosMock } = vi.hoisted(() => ({
  gerarExtratosMock: vi.fn(),
}));

vi.mock('../src/services/exportService', () => ({
  gerarExtratos: gerarExtratosMock,
}));

import exportRoutes from '../src/routes/exportRoutes';
import { errorHandler } from '../src/middlewares/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/export', exportRoutes);
  app.use(errorHandler);
  return app;
}

describe('Export controller', () => {
  beforeEach(() => {
    gerarExtratosMock.mockReset();
    gerarExtratosMock.mockResolvedValue({
      pessoalPath: 'C:/tmp/extrato_pessoal_25-03-2026.xlsx',
      empresaPath: 'C:/tmp/extrato_empresa_25-03-2026.xlsx',
    });
  });

  it('gera extratos em xlsx quando formato e informado', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/export')
      .send({ formato: 'xlsx' });

    expect(res.status).toBe(200);
    expect(gerarExtratosMock).toHaveBeenCalledWith('xlsx');
    expect(res.body).toEqual({
      formato: 'xlsx',
      pessoal: '/api/export/download?file=extrato_pessoal_25-03-2026.xlsx',
      empresa: '/api/export/download?file=extrato_empresa_25-03-2026.xlsx',
    });
  });

  it('mantem csv como formato padrao quando payload esta vazio', async () => {
    const app = createApp();
    gerarExtratosMock.mockResolvedValueOnce({
      pessoalPath: 'C:/tmp/extrato_pessoal_25-03-2026.csv',
      empresaPath: 'C:/tmp/extrato_empresa_25-03-2026.csv',
    });

    const res = await request(app)
      .post('/api/export')
      .send({});

    expect(res.status).toBe(200);
    expect(gerarExtratosMock).toHaveBeenCalledWith('csv');
    expect(res.body.formato).toBe('csv');
  });

  it('retorna 400 para formato invalido', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/export')
      .send({ formato: 'pdf' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Payload inválido.',
      codigo: 'VALIDATION_ERROR',
    });
    expect(gerarExtratosMock).not.toHaveBeenCalled();
  });
});
