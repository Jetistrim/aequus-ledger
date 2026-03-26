/// <reference types="node" />

import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';

async function safeReadResponseBody(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '[response body unavailable in Playwright context]';
  }
}

function buildXlsBufferWithHeaderBeforeColumns(): Buffer {
  const rows = [
    ['BANCO XPTO S.A.'],
    ['EXTRATO DE CONTA CORRENTE'],
    ['Cliente: FULANO DE TAL'],
    ['Conta: 1584-01.009742.5'],
    ['Periodo: 01/01/2026 a 19/03/2026'],
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

/**
 * Teste de percurso (não sobe o app automaticamente).
 * Pré-requisitos manuais:
 * 1) Rodar `npm run dev` na raiz do projeto.
 * 2) Opcional: exportar `XLS_FILE_PATH` com caminho absoluto de um .xls real.
 *    Se não informar, o teste gera um .xls válido em memória.
 *
 * Regra importante deste teste:
 * - Após o envio do arquivo, aguarda 8 segundos antes de validar erro.
 */
test('importa XLS com cabecalho anterior e valida erro apos 8 segundos', async ({ page }) => {
  const xlsPath = process.env['XLS_FILE_PATH'];

  await page.goto('http://localhost:5173');

  const uploadResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/upload') && response.request().method() === 'POST',
    { timeout: 120000 }
  );

  const fileInput = page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]');
  await expect(fileInput).toHaveCount(1, { timeout: 15000 });

  if (xlsPath) {
    await fileInput.setInputFiles(xlsPath);
  } else {
    await fileInput.setInputFiles({
      name: 'e2e-cabecalho-anterior.xls',
      mimeType: 'application/vnd.ms-excel',
      buffer: buildXlsBufferWithHeaderBeforeColumns(),
    });
  }

  await page.getByRole('button', { name: /Revisar Arquivos/i }).click();
  await page.getByRole('button', { name: /Processar\s+\d+\s+arquivo\(s\)/i }).click();

  const uploadResponse = await uploadResponsePromise;
  const responseBody = await safeReadResponseBody(uploadResponse);

  // Regra solicitada: esperar 8s apos envio para iniciar validacao de erro.
  await page.waitForTimeout(8_000);
  expect(
    uploadResponse.status(),
    `Upload retornou erro HTTP. Status: ${uploadResponse.status()} | Body: ${responseBody}`
  ).toBeLessThan(400);

  const erroUploadConhecido = page.getByText('Nenhuma transação válida encontrada nos arquivos.');
  await expect(erroUploadConhecido).toHaveCount(0);
});
