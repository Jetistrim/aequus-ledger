import express from 'express';
import request from 'supertest';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    regra: {
      findMany: vi.fn(),
    },
    transacao: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

import uploadRoutes from '../src/routes/uploadRoutes';
import { errorHandler } from '../src/middlewares/errorHandler';

function createApp() {
  const app = express();
  app.use('/api/upload', uploadRoutes);
  app.use(errorHandler);
  return app;
}

function buildSpreadsheetBuffer(bookType: 'xls' | 'xlsx'): Buffer {
  const rows = [
    ['', '', 'EXTRATO DE CONTA CORRENTE'],
    [],
    ['CLIENTE TESTE', '', '', '', '', '', 'Conta: 0001-9'],
    [],
    ['Tipo de Lancamento: Todos', '', '', '', '', '', 'Extrato de 01/01/2026 a 19/03/2026'],
    ['Data', 'Descricao', 'Docto', 'Situacao', 'Credito (R$)', 'Debito (R$)', 'Saldo (R$)'],
    ['18/03/2026', 'PAGAMENTO DE BOLETO', '000001', '', '', '-559,97', '-2.189,48'],
    ['18/03/2026', 'PIX ENVIADO', '000002', '', '', '-57,34', '-1.629,51'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
  return XLSX.write(wb, { bookType, type: 'buffer' }) as Buffer;
}

function buildCsvBuffer(): Buffer {
  const csv = [
    'EXTRATO DE CONTA CORRENTE',
    '',
    'Data;Descricao;Credito (R$);Debito (R$);Saldo (R$)',
    '18/03/2026;PAGAMENTO DE BOLETO;;-559,97;-2.189,48',
    '18/03/2026;PIX ENVIADO;;-57,34;-1.629,51',
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
}

function buildCsvComCabecalhoAnterior(): Buffer {
  const csv = [
    'BANCO XPTO S.A.',
    'EXTRATO DE CONTA CORRENTE',
    'Cliente: FULANO DE TAL',
    'Periodo: 01/03/2026 a 19/03/2026',
    '',
    'Data;Descricao;Credito (R$);Debito (R$);Saldo (R$)',
    '18/03/2026;PAGAMENTO DE BOLETO;;-559,97;-2.189,48',
    '18/03/2026;PIX ENVIADO;;-57,34;-1.629,51',
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
}

function buildCsvComLinhasDuplicadas(): Buffer {
  const csv = [
    'Data;Descricao;Credito (R$);Debito (R$);Saldo (R$)',
    '20/03/2026;PIX JOAO;;-50,00;100,00',
    '20/03/2026;PIX JOAO;;-50,00;50,00',
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
}

function buildXlsComCabecalhoAnterior(): Buffer {
  const rows = [
    ['BANCO XPTO S.A.'],
    ['EXTRATO DE CONTA CORRENTE'],
    ['Cliente: FULANO DE TAL'],
    ['Conta: 1584-01.009742.5'],
    ['Periodo: 01/03/2026 a 19/03/2026'],
    [],
    ['Data', 'Descricao', 'Docto', 'Situacao', 'Credito (R$)', 'Debito (R$)', 'Saldo (R$)'],
    ['18/03/2026', 'PAGAMENTO DE BOLETO', '000001', '', '', '-559,97', '-2.189,48'],
    ['18/03/2026', 'PIX ENVIADO', '000002', '', '', '-57,34', '-1.629,51'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
  return XLSX.write(wb, { bookType: 'xls', type: 'buffer' }) as Buffer;
}

function buildOfxBuffer(): Buffer {
  const ofx = [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    '',
    '<OFX>',
    '<BANKMSGSRSV1>',
    '<STMTTRNRS>',
    '<STMTRS>',
    '<BANKTRANLIST>',
    '<STMTTRN>',
    '<TRNTYPE>DEBIT',
    '<DTPOSTED>20260318000000',
    '<TRNAMT>-559.97',
    '<MEMO>PAGAMENTO DE BOLETO',
    '</STMTTRN>',
    '<STMTTRN>',
    '<TRNTYPE>DEBIT',
    '<DTPOSTED>20260318000000',
    '<TRNAMT>-57.34',
    '<MEMO>PIX ENVIADO',
    '</STMTTRN>',
    '</BANKTRANLIST>',
    '</STMTRS>',
    '</STMTTRNRS>',
    '</BANKMSGSRSV1>',
    '</OFX>',
  ].join('\n');

  return Buffer.from(ofx, 'utf-8');
}

function buildPixOfxComEstabelecimentoBuffer(): Buffer {
  const ofx = [
    'OFXHEADER:100',
    'DATA:OFXSGML',
    'VERSION:102',
    '',
    '<OFX>',
    '<BANKMSGSRSV1>',
    '<STMTTRNRS>',
    '<STMTRS>',
    '<BANKTRANLIST>',
    '<STMTTRN>',
    '<TRNTYPE>DEBIT',
    '<DTPOSTED>20260318000000',
    '<TRNAMT>-32.90',
    '<MEMO>PIX ENVIADO IFOOD</MEMO>',
    '</STMTTRN>',
    '</BANKTRANLIST>',
    '</STMTRS>',
    '</STMTTRNRS>',
    '</BANKMSGSRSV1>',
    '</OFX>',
  ].join('\n');

  return Buffer.from(ofx, 'utf-8');
}

beforeEach(() => {
  prismaMock.regra.findMany.mockReset();
  prismaMock.transacao.create.mockReset();
  prismaMock.regra.findMany.mockResolvedValue([]);
  prismaMock.transacao.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: crypto.randomUUID(),
    ...data,
    criadoEm: new Date('2026-03-20T00:00:00.000Z'),
    atualizadoEm: new Date('2026-03-20T00:00:00.000Z'),
  }));
});

describe('Upload e processamento por formato', () => {
  it('processa CSV com linhas introdutórias antes do cabeçalho', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildCsvBuffer(), { filename: 'extrato.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('processa OFX válido', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildOfxBuffer(), { filename: 'extrato.ofx', contentType: 'application/x-ofx' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('auto-classifica PIX com regra no upload e sinaliza pixAutoClassificado', async () => {
    prismaMock.regra.findMany.mockResolvedValue([
      {
        id: 1,
        palavraChave: 'IFOOD,RAPPI',
        categoria: 'PESSOAL',
        subCategoria: 'Alimentação',
        prioridade: 1,
      },
    ]);

    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildPixOfxComEstabelecimentoBuffer(), { filename: 'pix.ofx', contentType: 'application/x-ofx' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(1);
    expect(res.body.transacoes).toHaveLength(1);
    expect(res.body.transacoes[0]).toMatchObject({
      classificacao: 'PESSOAL',
      categoriaGenerica: 'Alimentação',
      pixAutoClassificado: true,
    });
  });

  it('processa XLS com cabeçalho deslocado', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildSpreadsheetBuffer('xls'), { filename: 'extrato.xls', contentType: 'application/vnd.ms-excel' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('processa XLSX com cabeçalho deslocado', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildSpreadsheetBuffer('xlsx'), {
        filename: 'extrato.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('processa CSV com cabeçalho anterior às colunas', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildCsvComCabecalhoAnterior(), { filename: 'extrato-cabecalho-anterior.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('processa XLS com cabeçalho anterior às colunas', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildXlsComCabecalhoAnterior(), { filename: 'extrato-cabecalho-anterior.xls', contentType: 'application/vnd.ms-excel' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.transacoes).toHaveLength(2);
  });

  it('importa linhas idênticas no mesmo arquivo com hashes e códigos distintos por ocorrência', async () => {
    const app = createApp();

    const res = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildCsvComLinhasDuplicadas(), { filename: 'duplicadas.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.importadas).toBe(2);
    expect(res.body.duplicadas).toBe(0);
    expect(res.body.transacoes).toHaveLength(2);

    const chamadas = prismaMock.transacao.create.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    expect(chamadas).toHaveLength(2);

    const primeiroPayload = chamadas[0][0].data;
    const segundoPayload = chamadas[1][0].data;

    expect(primeiroPayload.hashTransacao).not.toBe(segundoPayload.hashTransacao);
    expect(primeiroPayload.codigoReferencia).not.toBe(segundoPayload.codigoReferencia);
    expect(primeiroPayload.codigoReferencia).toMatch(/^\d{8}$/);
    expect(segundoPayload.codigoReferencia).toMatch(/^\d{8}$/);
  });

  it('trata reimportação do mesmo arquivo como duplicata mantendo hash estável por ocorrência', async () => {
    const vistos = new Set<string>();
    prismaMock.transacao.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const hash = String(data.hashTransacao);
      if (vistos.has(hash)) {
        const error = new Error('Unique constraint failed') as Error & { code?: string };
        error.code = 'P2002';
        throw error;
      }

      vistos.add(hash);
      return {
        id: crypto.randomUUID(),
        ...data,
        criadoEm: new Date('2026-03-20T00:00:00.000Z'),
        atualizadoEm: new Date('2026-03-20T00:00:00.000Z'),
      };
    });

    const app = createApp();

    const primeiraImportacao = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildCsvComLinhasDuplicadas(), { filename: 'duplicadas.csv', contentType: 'text/csv' });

    const segundaImportacao = await request(app)
      .post('/api/upload')
      .attach('arquivos', buildCsvComLinhasDuplicadas(), { filename: 'duplicadas.csv', contentType: 'text/csv' });

    expect(primeiraImportacao.status).toBe(200);
    expect(primeiraImportacao.body.importadas).toBe(2);
    expect(primeiraImportacao.body.duplicadas).toBe(0);

    expect(segundaImportacao.status).toBe(200);
    expect(segundaImportacao.body.importadas).toBe(0);
    expect(segundaImportacao.body.duplicadas).toBe(2);
    expect(segundaImportacao.body.transacoes).toHaveLength(0);
  });
});
