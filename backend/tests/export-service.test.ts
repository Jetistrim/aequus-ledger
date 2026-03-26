import fs from 'fs';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transacao: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

function criarTransacao(partial: {
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
  classificacao: 'PESSOAL' | 'EMPRESA';
  categoriaGenerica?: string | null;
  codigoReferencia?: string | null;
  identificador?: string;
  dataTransacao?: Date;
}) {
  return {
    id: crypto.randomUUID(),
    dataTransacao: partial.dataTransacao ?? new Date('2026-03-25T00:00:00.000Z'),
    descricao: partial.descricao,
    valor: partial.valor,
    tipo: partial.tipo,
    classificacao: partial.classificacao,
    categoriaGenerica: partial.categoriaGenerica ?? null,
    hashTransacao: crypto.randomUUID(),
    codigoReferencia: partial.codigoReferencia ?? null,
    identificador: partial.identificador ?? '',
    arquivoOrigem: 'teste.csv',
    criadoEm: new Date('2026-03-25T00:00:00.000Z'),
    atualizadoEm: new Date('2026-03-25T00:00:00.000Z'),
  };
}

describe('Export service', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-export-'));
    process.env.EXPORTS_DIR = tempDir;
    prismaMock.transacao.findMany.mockReset();
    vi.resetModules();
  });

  it('gera csv com resumo ao final do arquivo', async () => {
    prismaMock.transacao.findMany
      .mockResolvedValueOnce([
        criarTransacao({ descricao: 'SALARIO', valor: 1000, tipo: 'ENTRADA', classificacao: 'PESSOAL' }),
        criarTransacao({ descricao: '=UBER', valor: 250.5, tipo: 'SAIDA', classificacao: 'PESSOAL' }),
      ])
      .mockResolvedValueOnce([
        criarTransacao({ descricao: 'CLIENTE XPTO', valor: 500, tipo: 'ENTRADA', classificacao: 'EMPRESA' }),
      ]);

    const { gerarExtratos } = await import('../src/services/exportService');
    const { pessoalPath, empresaPath } = await gerarExtratos('csv');

    expect(path.extname(pessoalPath)).toBe('.csv');
    expect(path.extname(empresaPath)).toBe('.csv');

    const conteudo = fs.readFileSync(pessoalPath, 'utf8');
    expect(conteudo).toContain('"data_transacao";"descricao";"valor";"tipo";"classificacao";"categoria_generica";"codigo_referencia";"identificador"');
    expect(conteudo).toContain("'=UBER");
    expect(conteudo).toContain('total_entradas;1000,00;;;;;;');
    expect(conteudo).toContain('total_saidas;250,50;;;;;;');
    expect(conteudo).toContain('saldo_liquido;749,50;;;;;;');
    expect(conteudo).toContain('Saldo positivo no periodo');
  });

  it('gera xlsx com formulas de resumo e totais', async () => {
    prismaMock.transacao.findMany
      .mockResolvedValueOnce([
        criarTransacao({ descricao: 'SALARIO', valor: 1000, tipo: 'ENTRADA', classificacao: 'PESSOAL' }),
        criarTransacao({ descricao: 'ALUGUEL', valor: 400, tipo: 'SAIDA', classificacao: 'PESSOAL' }),
      ])
      .mockResolvedValueOnce([
        criarTransacao({ descricao: 'CLIENTE ACME', valor: 900, tipo: 'ENTRADA', classificacao: 'EMPRESA' }),
      ]);

    const { gerarExtratos } = await import('../src/services/exportService');
    const { pessoalPath } = await gerarExtratos('xlsx');

    expect(path.extname(pessoalPath)).toBe('.xlsx');

    const workbook = XLSX.readFile(pessoalPath, { cellFormula: true });
    const sheet = workbook.Sheets.Pessoal;

    expect(sheet.A1.v).toBe('Extrato Pessoal');
    expect(sheet.A4.v).toBe('Resumo financeiro');
    expect(sheet.B5).toBeDefined();
    expect(sheet.B6).toBeDefined();
    expect(sheet.B7).toBeDefined();
    expect(sheet.B8.v).toContain('Saldo positivo no periodo');
    expect(sheet.C11.v).toBe(1000);
    expect(sheet.C12.v).toBe(-400);
  });
});
