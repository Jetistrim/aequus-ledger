import path from 'path';
import fs from 'fs';
import { Transacao } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { Parser } from 'json2csv';
import { protectCsvFormula } from '../utils/normalization';

const EXPORTS_DIR = process.env.EXPORTS_DIR || './exports';

function formatarData(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Gera os dois CSVs (pessoal e empresa) e retorna os caminhos dos arquivos.
 */
export async function gerarExtratos(): Promise<{ pessoalPath: string; empresaPath: string }> {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  const [transacoesPessoal, transacoesEmpresa] = await Promise.all([
    prisma.transacao.findMany({ where: { classificacao: 'PESSOAL' }, orderBy: { dataTransacao: 'desc' } }),
    prisma.transacao.findMany({ where: { classificacao: 'EMPRESA' }, orderBy: { dataTransacao: 'desc' } }),
  ]);

  const hoje = formatarData(new Date());
  const pessoalPath = path.resolve(EXPORTS_DIR, `extrato_pessoal_${hoje}.csv`);
  const empresaPath = path.resolve(EXPORTS_DIR, `extrato_empresa_${hoje}.csv`);

  const campos = ['data_transacao', 'descricao', 'valor', 'tipo', 'classificacao', 'categoria_generica', 'codigo_referencia', 'identificador'];

  const mapear = (t: Transacao) => ({
    data_transacao: t.dataTransacao.toISOString().split('T')[0],
    descricao: protectCsvFormula(t.descricao),
    valor: Number(t.valor).toFixed(2).replace('.', ','),
    tipo: t.tipo,
    classificacao: t.classificacao,
    categoria_generica: t.categoriaGenerica ?? '',
    codigo_referencia: protectCsvFormula(t.codigoReferencia || ''),
    identificador: protectCsvFormula(t.identificador || ''),
  });

  // BOM UTF-8 para compatibilidade com Excel
  const BOM = '\uFEFF';

  for (const [transacoes, filePath] of [
    [transacoesPessoal, pessoalPath],
    [transacoesEmpresa, empresaPath],
  ] as [Transacao[], string][]) {
    const parser = new Parser({ fields: campos, delimiter: ';' });
    const csvContent = BOM + parser.parse(transacoes.map(mapear));
    fs.writeFileSync(filePath, csvContent, { encoding: 'utf8' });
  }

  return { pessoalPath, empresaPath };
}
