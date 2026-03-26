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
    transacao: {
      findMany: vi.fn(),
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
  prismaMock.transacao.findMany.mockReset();

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

  prismaMock.regra.findMany.mockResolvedValue([
    {
      id: 1,
      palavraChave: 'IFOOD',
      categoria: 'PESSOAL',
      subCategoria: 'Alimentação',
      prioridade: 1,
    },
  ]);

  prismaMock.transacao.findMany.mockResolvedValue([
    {
      descricao: 'PIX ENVIADO IFOOD',
      valor: 25,
      tipo: 'SAIDA',
      dataTransacao: new Date('2026-03-20T10:00:00.000Z'),
      classificacao: 'INDEFINIDO',
    },
  ]);
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

  it('executa diagnostico de regras com modo SALVAS', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'SALVAS',
        usarIndefinidasBanco: true,
        limiteAmostras: 10,
      });

    expect(res.status).toBe(200);
    expect(prismaMock.regra.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.transacao.findMany).toHaveBeenCalledTimes(1);
    expect(res.body).toMatchObject({
      modoRegras: 'SALVAS',
      totalAmostras: 1,
      origemAmostras: 'BANCO_INDEFINIDAS',
      resumoIndefinidas: {
        quantidadeTotal: 1,
        quantidadePix: 1,
      },
    });
  });

  it('executa diagnostico sem acessar banco quando modo TEMPORARIAS e sem indefinidas', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'TEMPORARIAS',
        usarIndefinidasBanco: false,
        regrasTemporarias: [
          {
            palavraChave: 'RAPPI',
            categoria: 'PESSOAL',
            subCategoria: 'Alimentação',
            prioridade: 1,
          },
        ],
        amostrasManuais: [
          {
            descricao: 'PAGAMENTO RAPPI',
            valor: 45.9,
            tipo: 'SAIDA',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(prismaMock.regra.findMany).not.toHaveBeenCalled();
    expect(prismaMock.transacao.findMany).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      modoRegras: 'TEMPORARIAS',
      origemAmostras: 'MANUAL',
      resumoClassificacaoTeste: {
        pessoal: 1,
      },
    });
  });

  it('combina amostras manuais e banco em modo AMBAS', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'AMBAS',
        usarIndefinidasBanco: true,
        regrasTemporarias: [
          {
            palavraChave: 'SANTANDER',
            categoria: 'EMPRESA',
            subCategoria: 'Banco',
            prioridade: 0,
          },
        ],
        amostrasManuais: [
          {
            descricao: 'PIX SANTANDER',
            valor: 1000,
            tipo: 'SAIDA',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      origemAmostras: 'MISTO',
      totalAmostras: 2,
    });
  });

  it('retorna 400 quando desabilita banco sem amostras manuais', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'SALVAS',
        usarIndefinidasBanco: false,
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      codigo: 'VALIDATION_ERROR',
    });
    expect(res.body.detalhes).toEqual([
      { campo: 'payload', mensagem: 'Informe amostras manuais quando usarIndefinidasBanco for false.' },
    ]);
  });

  it('retorna 400 para modo de regras invalido', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'INVALIDO',
        usarIndefinidasBanco: true,
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      codigo: 'VALIDATION_ERROR',
    });
  });

  it('aceita modoRegras e tipo em lowercase', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/regras/teste')
      .send({
        modoRegras: 'ambas',
        usarIndefinidasBanco: false,
        amostrasManuais: [
          {
            descricao: 'PIX ENVIADO IFOOD',
            valor: 12.5,
            tipo: 'saida',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      modoRegras: 'AMBAS',
      totalAmostras: 1,
      origemAmostras: 'MANUAL',
    });
  });
});
