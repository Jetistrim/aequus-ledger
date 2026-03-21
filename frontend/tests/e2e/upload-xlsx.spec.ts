import { test } from '@playwright/test';
import { buildSpreadsheetFixture, getFixtureFromEnvOrFactory, uploadSingleFileAndAssert } from './upload-helpers';

test('importa XLSX com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(
    page,
    getFixtureFromEnvOrFactory('XLSX_FILE_PATH', () => buildSpreadsheetFixture('xlsx'))
  );
});
