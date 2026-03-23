import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transacao: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
  isSqlite: false,
}));

import transacoesRoutes from '../src/routes/transacoesRoutes';
import { errorHandler } from '../src/middlewares/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/transacoes', transacoesRoutes);
  app.use(errorHandler);
  return app;
}

function createP2025Error(): Prisma.PrismaClientKnownRequestError {
  const err = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  err.code = 'P2025';
  err.name = 'PrismaClientKnownRequestError';
  err.message = 'Record not found';
  return err;
}

beforeEach(() => {
  prismaMock.transacao.count.mockReset();
  prismaMock.transacao.findMany.mockReset();
  prismaMock.transacao.aggregate.mockReset();
  prismaMock.transacao.update.mockReset();
  prismaMock.transacao.delete.mockReset();
  prismaMock.transacao.deleteMany.mockReset();

  prismaMock.transacao.update.mockResolvedValue({
    id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38',
    classificacao: 'PESSOAL',
    identificador: 'ID 01',
    categoriaGenerica: 'Alimentacao',
  });
  prismaMock.transacao.delete.mockResolvedValue({
    id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38',
  });
  prismaMock.transacao.deleteMany.mockResolvedValue({ count: 3 });
});

describe('Transacoes controller', () => {
  it('atualiza transacao com payload valido', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({ classificacao: 'EMPRESA', identificador: 'Pedido 123' });

    expect(res.status).toBe(200);
    expect(prismaMock.transacao.update).toHaveBeenCalledWith({
      where: { id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38' },
      data: { classificacao: 'EMPRESA', identificador: 'Pedido 123' },
    });
  });

  it('atualiza transacao com payload combinado incluindo categoria e indefinido', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({
        classificacao: 'INDEFINIDO',
        identificador: 'Revisar depois',
        categoriaGenerica: 'Transferencia',
      });

    expect(res.status).toBe(200);
    expect(prismaMock.transacao.update).toHaveBeenCalledWith({
      where: { id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38' },
      data: {
        classificacao: 'INDEFINIDO',
        identificador: 'Revisar depois',
        categoriaGenerica: 'Transferencia',
      },
    });
  });

  it('atualiza transacao permitindo categoriaGenerica nula', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({ categoriaGenerica: null });

    expect(res.status).toBe(200);
    expect(prismaMock.transacao.update).toHaveBeenCalledWith({
      where: { id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38' },
      data: { categoriaGenerica: null },
    });
  });

  it('retorna 400 para payload vazio no PATCH', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Payload inválido.',
      codigo: 'VALIDATION_ERROR',
    });
    expect(res.body.detalhes).toEqual([
      { campo: 'payload', mensagem: 'Informe ao menos um campo para atualização.' },
    ]);
    expect(prismaMock.transacao.update).not.toHaveBeenCalled();
  });

  it('retorna 400 para classificacao invalida no PATCH', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({ classificacao: 'OUTRO' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Payload inválido.',
      codigo: 'VALIDATION_ERROR',
    });
    expect(res.body.detalhes).toEqual([
      { campo: 'classificacao', mensagem: 'Invalid option: expected one of "PESSOAL"|"EMPRESA"|"INDEFINIDO"' },
    ]);
    expect(prismaMock.transacao.update).not.toHaveBeenCalled();
  });

  it('retorna 400 com detalhe de campo para id invalido no PATCH', async () => {
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/id-invalido')
      .send({ classificacao: 'PESSOAL' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Parâmetros inválidos.',
      codigo: 'VALIDATION_ERROR',
      detalhes: [{ campo: 'id', mensagem: 'ID inválido.' }],
    });
  });

  it('retorna 404 quando PATCH recebe id inexistente', async () => {
    prismaMock.transacao.update.mockRejectedValueOnce(createP2025Error());
    const app = createApp();

    const res = await request(app)
      .patch('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38')
      .send({ classificacao: 'PESSOAL' });

    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Transação não encontrada.');
  });

  it('deleta transacao individual com sucesso', async () => {
    const app = createApp();

    const res = await request(app).delete('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38');

    expect(res.status).toBe(204);
    expect(prismaMock.transacao.delete).toHaveBeenCalledWith({
      where: { id: '8f255f8e-8a96-47e2-bf2d-a8c0ec062f38' },
    });
  });

  it('retorna 400 para id invalido no DELETE individual', async () => {
    const app = createApp();

    const res = await request(app).delete('/api/transacoes/id-invalido');

    expect(res.status).toBe(400);
    expect(prismaMock.transacao.delete).not.toHaveBeenCalled();
  });

  it('retorna 404 quando DELETE individual recebe id inexistente', async () => {
    prismaMock.transacao.delete.mockRejectedValueOnce(createP2025Error());
    const app = createApp();

    const res = await request(app).delete('/api/transacoes/8f255f8e-8a96-47e2-bf2d-a8c0ec062f38');

    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('Transação não encontrada.');
  });

  it('deleta todas as transacoes com 204', async () => {
    const app = createApp();

    const res = await request(app).delete('/api/transacoes');

    expect(res.status).toBe(204);
    expect(prismaMock.transacao.deleteMany).toHaveBeenCalledWith({});
  });
});
