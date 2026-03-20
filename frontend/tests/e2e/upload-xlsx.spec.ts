import { test } from '@playwright/test';
import { buildSpreadsheetFixture, uploadSingleFileAndAssert } from './upload-helpers';

test('importa XLSX com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(page, buildSpreadsheetFixture('xlsx'));
});
