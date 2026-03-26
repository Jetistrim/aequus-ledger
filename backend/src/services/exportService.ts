import fs from 'fs';
import path from 'path';
import { Parser } from 'json2csv';
import { Transacao } from '@prisma/client';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { protectCsvFormula, sanitizeTextInput } from '../utils/normalization';

const EXPORTS_DIR = process.env.EXPORTS_DIR || './exports';
const CSV_COLUMNS = [
  'data_transacao',
  'descricao',
  'valor',
  'tipo',
  'classificacao',
  'categoria_generica',
  'codigo_referencia',
  'identificador',
];
const XLSX_TABLE_HEADERS = [
  'Data',
  'Descricao',
  'Valor',
  'Tipo',
  'Classificacao',
  'Categoria',
  'Codigo de referencia',
  'Identificador',
];

export type ExportFormat = 'csv' | 'xlsx';
type ExportScope = 'pessoal' | 'empresa';

interface ExportSummary {
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  mensagemSaldo: string;
}

interface ExportDataset {
  scope: ExportScope;
  titulo: string;
  subtitulo: string;
  filePath: string;
  transacoes: Transacao[];
  summary: ExportSummary;
}

interface ExportResult {
  pessoalPath: string;
  empresaPath: string;
}

function formatarData(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

function formatarMoeda(valor: number): string {
  return valor.toFixed(2).replace('.', ',');
}

function formatarResumoMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function montarMensagemSaldo(saldoLiquido: number): string {
  if (saldoLiquido > 0) {
    return `Saldo positivo no periodo: recebemos ${formatarResumoMoeda(saldoLiquido)} a mais do que gastamos.`;
  }

  if (saldoLiquido < 0) {
    return `Saldo negativo no periodo: gastamos ${formatarResumoMoeda(Math.abs(saldoLiquido))} a mais do que recebemos.`;
  }

  return 'Saldo zerado no periodo: recebimentos e gastos ficaram empatados.';
}

function obterValorAssinado(transacao: Pick<Transacao, 'valor' | 'tipo'>): number {
  const valorAbsoluto = Math.abs(Number(transacao.valor));
  return transacao.tipo === 'SAIDA' ? -valorAbsoluto : valorAbsoluto;
}

function calcularResumo(transacoes: Transacao[]): ExportSummary {
  const totalEntradas = transacoes
    .filter((transacao) => transacao.tipo === 'ENTRADA')
    .reduce((acc, transacao) => acc + Math.abs(Number(transacao.valor)), 0);
  const totalSaidas = transacoes
    .filter((transacao) => transacao.tipo === 'SAIDA')
    .reduce((acc, transacao) => acc + Math.abs(Number(transacao.valor)), 0);
  const saldoLiquido = totalEntradas - totalSaidas;

  return {
    totalEntradas,
    totalSaidas,
    saldoLiquido,
    mensagemSaldo: montarMensagemSaldo(saldoLiquido),
  };
}

function mapearCsv(transacao: Transacao) {
  const valorAssinado = obterValorAssinado(transacao);

  return {
    data_transacao: transacao.dataTransacao.toISOString().split('T')[0],
    descricao: protectCsvFormula(transacao.descricao),
    valor: formatarMoeda(valorAssinado),
    tipo: transacao.tipo,
    classificacao: transacao.classificacao,
    categoria_generica: protectCsvFormula(transacao.categoriaGenerica ?? ''),
    codigo_referencia: protectCsvFormula(transacao.codigoReferencia ?? ''),
    identificador: protectCsvFormula(transacao.identificador ?? ''),
  };
}

function mapearXlsx(transacao: Transacao): Array<string | number> {
  const valorAssinado = obterValorAssinado(transacao);

  return [
    transacao.dataTransacao.toISOString().split('T')[0],
    sanitizeTextInput(transacao.descricao),
    valorAssinado,
    transacao.tipo,
    transacao.classificacao,
    sanitizeTextInput(transacao.categoriaGenerica ?? ''),
    sanitizeTextInput(transacao.codigoReferencia ?? ''),
    sanitizeTextInput(transacao.identificador ?? ''),
  ];
}

function montarDatasets(
  transacoesPessoal: Transacao[],
  transacoesEmpresa: Transacao[],
  formato: ExportFormat,
): ExportDataset[] {
  const hoje = formatarData(new Date());
  const extensao = formato === 'xlsx' ? 'xlsx' : 'csv';

  return [
    {
      scope: 'pessoal',
      titulo: 'Extrato Pessoal',
      subtitulo: `Gerado em ${hoje}`,
      filePath: path.resolve(EXPORTS_DIR, `extrato_pessoal_${hoje}.${extensao}`),
      transacoes: transacoesPessoal,
      summary: calcularResumo(transacoesPessoal),
    },
    {
      scope: 'empresa',
      titulo: 'Extrato Empresa',
      subtitulo: `Gerado em ${hoje}`,
      filePath: path.resolve(EXPORTS_DIR, `extrato_empresa_${hoje}.${extensao}`),
      transacoes: transacoesEmpresa,
      summary: calcularResumo(transacoesEmpresa),
    },
  ];
}

function montarLinhaResumoCsv(rotulo: string, valor: string): string {
  return [rotulo, valor, '', '', '', '', '', ''].join(';');
}

function criarCsv(dataset: ExportDataset): void {
  const parser = new Parser({ fields: CSV_COLUMNS, delimiter: ';' });
  const linhas = dataset.transacoes.map(mapearCsv);
  const csvBody = linhas.length > 0 ? parser.parse(linhas) : CSV_COLUMNS.join(';');
  const resumo = [
    '',
    montarLinhaResumoCsv('resumo', protectCsvFormula(dataset.titulo)),
    montarLinhaResumoCsv('gerado_em', protectCsvFormula(dataset.subtitulo)),
    montarLinhaResumoCsv('total_entradas', formatarMoeda(dataset.summary.totalEntradas)),
    montarLinhaResumoCsv('total_saidas', formatarMoeda(dataset.summary.totalSaidas)),
    montarLinhaResumoCsv('saldo_liquido', formatarMoeda(dataset.summary.saldoLiquido)),
    montarLinhaResumoCsv('status', protectCsvFormula(dataset.summary.mensagemSaldo)),
  ].join('\n');

  fs.writeFileSync(dataset.filePath, `\uFEFF${csvBody}\n${resumo}`, { encoding: 'utf8' });
}

function aplicarFormatacaoXlsx(worksheet: XLSX.WorkSheet, startRow: number, endRow: number): void {
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 46 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
  ];
  worksheet['!merges'] = [
    XLSX.utils.decode_range('A1:H1'),
    XLSX.utils.decode_range('A2:H2'),
  ];
  worksheet['!autofilter'] = { ref: `A${startRow}:H${endRow}` };
}

function definirTexto(worksheet: XLSX.WorkSheet, cell: string, value: string): void {
  worksheet[cell] = { t: 's', v: value };
}

function definirNumero(worksheet: XLSX.WorkSheet, cell: string, value: number): void {
  worksheet[cell] = { t: 'n', v: value, z: 'R$ #,##0.00' };
}

function definirFormula(worksheet: XLSX.WorkSheet, cell: string, formula: string): void {
  worksheet[cell] = { t: 'n', v: 0, f: formula, z: 'R$ #,##0.00' };
}

function criarXlsx(dataset: ExportDataset): void {
  const workbook = XLSX.utils.book_new();
  const linhas: Array<Array<string | number>> = [
    [dataset.titulo],
    [dataset.subtitulo],
    [],
    ['Resumo financeiro', 'Valor'],
    ['Total de entradas', 0],
    ['Total de saidas', 0],
    ['Saldo liquido', 0],
    ['Status final', dataset.summary.mensagemSaldo],
    [],
    XLSX_TABLE_HEADERS,
  ];
  const dataStartRow = 11;
  const dataRows = dataset.transacoes.map(mapearXlsx);

  if (dataRows.length > 0) {
    linhas.push(...dataRows);
  } else {
    linhas.push(['Sem transacoes classificadas para este extrato.', '', 0, '', '', '', '', '']);
  }

  linhas.push([]);
  linhas.push(['Totais da tabela', '', 0, '', '', '', '', '']);

  const worksheet = XLSX.utils.aoa_to_sheet(linhas);
  const dataEndRow = dataRows.length > 0 ? dataStartRow + dataRows.length - 1 : dataStartRow;
  const totalRow = dataEndRow + 2;

  if (dataRows.length > 0) {
    definirFormula(worksheet, 'B5', `SUMIF(D${dataStartRow}:D${dataEndRow},"ENTRADA",C${dataStartRow}:C${dataEndRow})`);
    definirFormula(worksheet, 'B6', `ABS(SUMIF(D${dataStartRow}:D${dataEndRow},"SAIDA",C${dataStartRow}:C${dataEndRow}))`);
    definirFormula(worksheet, 'B7', `SUM(C${dataStartRow}:C${dataEndRow})`);
    definirFormula(worksheet, `C${totalRow}`, `SUM(C${dataStartRow}:C${dataEndRow})`);
  } else {
    definirNumero(worksheet, 'B5', dataset.summary.totalEntradas);
    definirNumero(worksheet, 'B6', dataset.summary.totalSaidas);
    definirNumero(worksheet, 'B7', dataset.summary.saldoLiquido);
    definirNumero(worksheet, `C${totalRow}`, 0);
  }

  definirTexto(worksheet, 'A8', 'Status final');
  definirTexto(worksheet, 'B8', dataset.summary.mensagemSaldo);

  for (let row = dataStartRow; row <= dataEndRow; row += 1) {
    const valueCell = `C${row}`;
    if (worksheet[valueCell] && typeof worksheet[valueCell].v === 'number') {
      worksheet[valueCell].z = 'R$ #,##0.00';
    }
  }

  aplicarFormatacaoXlsx(worksheet, 10, dataEndRow);
  XLSX.utils.book_append_sheet(workbook, worksheet, dataset.scope === 'pessoal' ? 'Pessoal' : 'Empresa');
  XLSX.writeFile(workbook, dataset.filePath, { bookType: 'xlsx' });
}

function escreverArquivos(datasets: ExportDataset[], formato: ExportFormat): ExportResult {
  for (const dataset of datasets) {
    if (formato === 'xlsx') {
      criarXlsx(dataset);
      continue;
    }

    criarCsv(dataset);
  }

  const pessoal = datasets.find((dataset) => dataset.scope === 'pessoal');
  const empresa = datasets.find((dataset) => dataset.scope === 'empresa');

  if (!pessoal || !empresa) {
    throw new Error('Falha ao montar arquivos de exportacao.');
  }

  return {
    pessoalPath: pessoal.filePath,
    empresaPath: empresa.filePath,
  };
}

export async function gerarExtratos(formato: ExportFormat = 'csv'): Promise<ExportResult> {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  const [transacoesPessoal, transacoesEmpresa] = await Promise.all([
    prisma.transacao.findMany({ where: { classificacao: 'PESSOAL' }, orderBy: { dataTransacao: 'desc' } }),
    prisma.transacao.findMany({ where: { classificacao: 'EMPRESA' }, orderBy: { dataTransacao: 'desc' } }),
  ]);

  const datasets = montarDatasets(transacoesPessoal, transacoesEmpresa, formato);
  return escreverArquivos(datasets, formato);
}

export const __exportServiceInternals = {
  calcularResumo,
  mapearCsv,
  montarLinhaResumoCsv,
  montarMensagemSaldo,
  obterValorAssinado,
};
