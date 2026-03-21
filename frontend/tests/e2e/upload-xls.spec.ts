import { test } from '@playwright/test';
import { buildSpreadsheetFixture, getFixtureFromEnvOrFactory, uploadSingleFileAndAssert } from './upload-helpers';

test('importa XLS com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(
    page,
    getFixtureFromEnvOrFactory('XLS_FILE_PATH', () => buildSpreadsheetFixture('xls'))
  );
});
