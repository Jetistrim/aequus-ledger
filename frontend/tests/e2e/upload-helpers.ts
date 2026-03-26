/// <reference types="node" />

import { expect, Page } from '@playwright/test';
import * as XLSX from 'xlsx';

export interface UploadFixture {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export type UploadFileInput = UploadFixture | string;

const VALIDACAO_422_APOS_UPLOAD_MS = 8_000;

async function safeReadResponseBody(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '[response body unavailable in Playwright context]';
  }
}

export function buildCsvFixture(): UploadFixture {
  const csv = [
    'Data;Descricao;Valor',
    '19/03/2026;MERCADO TESTE;123,45',
    '18/03/2026;PIX ENVIADO;-57,34',
  ].join('\n');

  return {
    name: 'e2e-transacoes.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  };
}

export function buildOfxFixture(): UploadFixture {
  const ofx = [
    '<OFX>',
    '  <BANKMSGSRSV1>',
    '    <STMTTRNRS>',
    '      <STMTRS>',
    '        <BANKTRANLIST>',
    '          <STMTTRN>',
    '            <TRNTYPE>DEBIT',
    '            <DTPOSTED>20260318120000',
    '            <TRNAMT>-57.34',
    '            <MEMO>PIX ENVIADO TESTE',
    '          </STMTTRN>',
    '        </BANKTRANLIST>',
    '      </STMTRS>',
    '    </STMTTRNRS>',
    '  </BANKMSGSRSV1>',
    '</OFX>',
  ].join('\n');

  return {
    name: 'e2e-transacoes.ofx',
    mimeType: 'application/x-ofx',
    buffer: Buffer.from(ofx, 'utf-8'),
  };
}

export function buildSpreadsheetFixture(bookType: 'xls' | 'xlsx'): UploadFixture {
  const rows = [
    ['Data', 'Descricao', 'Docto', 'Situacao', 'Credito (R$)', 'Debito (R$)', 'Saldo (R$)'],
    ['18/03/2026', 'PAGAMENTO DE BOLETO', '000001', '', '', '-559,97', '-2.189,48'],
    ['17/03/2026', 'RECEBIMENTO CLIENTE', '000002', '', '1.200,00', '', '-989,48'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Extrato');

  const mimeType =
    bookType === 'xls'
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  return {
    name: `e2e-transacoes.${bookType}`,
    mimeType,
    buffer: XLSX.write(wb, { bookType, type: 'buffer' }) as Buffer,
  };
}

export async function uploadSingleFileAndAssert(page: Page, fixture: UploadFileInput): Promise<void> {
  await page.goto('/');

  const uploadResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/upload') && response.request().method() === 'POST',
    { timeout: 120000 }
  );

  const fileInput = page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]');
  await expect(fileInput).toHaveCount(1, { timeout: 15000 });

  // Each test uploads exactly one file, matching the UI rule for non-folder imports.
  await fileInput.setInputFiles(fixture);

  await page.getByRole('button', { name: /Revisar Arquivos/i }).click();
  await page.getByRole('button', { name: /Processar\s+\d+\s+arquivo\(s\)/i }).click();

  const uploadResponse = await uploadResponsePromise;
  const responseBody = await safeReadResponseBody(uploadResponse);

  // Rule: every import must wait 8s before checking if a 422-like failure appears.
  await page.waitForTimeout(VALIDACAO_422_APOS_UPLOAD_MS);

  expect(
    uploadResponse.status(),
    `Upload retornou erro HTTP. Status: ${uploadResponse.status()} | Body: ${responseBody}`
  ).toBeLessThan(400);

  await expect(page.getByText('Nenhuma transação válida encontrada nos arquivos.')).toHaveCount(0);
  await expect(page.getByText(/transações importadas/i)).toBeVisible();
}

export function getFixtureFromEnvOrFactory(envVarName: string, factory: () => UploadFixture): UploadFileInput {
  const realFilePath = process.env[envVarName]?.trim();
  if (realFilePath) {
    return realFilePath;
  }

  return factory();
}
