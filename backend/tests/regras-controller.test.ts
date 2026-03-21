import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    regra: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import regrasRoutes from '../src/routes/regrasRoutes';
import { errorHandler } from '../src/middlewares/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/regras', regrasRoutes);
  app.use(errorHandler);
  return app;
}

function createKnownError(code: 'P2002' | 'P2025'): Prisma.PrismaClientKnownRequestError {
  const err = Object.create(Prisma.PrismaClientKnownRequestError.prototype) as Prisma.PrismaClientKnownRequestError;
  err.code = code;
  err.name = 'PrismaClientKnownRequestError';
  err.message = 'Known request error';
  return err;
}

beforeEach(() => {
  prismaMock.regra.findMany.mockReset();
  prismaMock.regra.create.mockReset();
  prismaMock.regra.update.mockReset();
  prismaMock.regra.delete.mockReset();

  prismaMock.regra.create.mockResolvedValue({
    id: 1,
    palavraChave: 'IFOOD',
    categoria: 'PESSOAL',
    subCategoria: 'Alimentação',
    prioridade: 1,
  });

  prismaMock.regra.update.mockResolvedValue({
    id: 1,
    palavraChave: 'IFOOD,RAPPI',
    categoria: 'PESSOAL',
    subCategoria: 'Alimentação',
    prioridade: 1,
  });
});

describe('Regras controller', () => {
  it('cria regra com payload valido', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras')
      .send({ palavraChave: 'IFOOD', categoria: 'PESSOAL', prioridade: 1 });

    expect(res.status).toBe(201);
    expect(prismaMock.regra.create).toHaveBeenCalledWith({
      data: { palavraChave: 'IFOOD', categoria: 'PESSOAL', subCategoria: null, prioridade: 1 },
    });
  });

  it('retorna 400 com detalhes para payload invalido no POST', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras')
      .send({ categoria: 'PESSOAL' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Payload inválido.',
      codigo: 'VALIDATION_ERROR',
    });
    expect(res.body.detalhes).toEqual([
      { campo: 'palavraChave', mensagem: 'Invalid input: expected string, received undefined' },
    ]);
  });

  it('retorna 409 no POST para conflito de unicidade', async () => {
    prismaMock.regra.create.mockRejectedValueOnce(createKnownError('P2002'));
    const app = createApp();

    const res = await request(app)
      .post('/api/regras')
      .send({ palavraChave: 'IFOOD', categoria: 'PESSOAL', prioridade: 1 });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      erro: 'Já existe uma regra com os mesmos critérios.',
      codigo: 'RESOURCE_CONFLICT',
    });
  });

  it('retorna 400 com detalhe para id invalido no PUT', async () => {
    const app = createApp();

    const res = await request(app)
      .put('/api/regras/abc')
      .send({ palavraChave: 'IFOOD' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Parâmetros inválidos.',
      codigo: 'VALIDATION_ERROR',
      detalhes: [{ campo: 'id', mensagem: 'Invalid input: expected number, received NaN' }],
    });
  });

  it('retorna 400 para payload vazio no PUT', async () => {
    const app = createApp();

    const res = await request(app)
      .put('/api/regras/1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      erro: 'Payload inválido.',
      codigo: 'VALIDATION_ERROR',
      detalhes: [{ campo: 'payload', mensagem: 'Informe ao menos um campo para atualização.' }],
    });
  });

  it('retorna 404 no PUT para regra inexistente', async () => {
    prismaMock.regra.update.mockRejectedValueOnce(createKnownError('P2025'));
    const app = createApp();

    const res = await request(app)
      .put('/api/regras/99')
      .send({ palavraChave: 'NOVA' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      erro: 'Regra não encontrada.',
      codigo: 'RESOURCE_NOT_FOUND',
    });
  });
});
