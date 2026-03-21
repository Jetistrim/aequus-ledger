import { test } from '@playwright/test';
import { buildCsvFixture, getFixtureFromEnvOrFactory, uploadSingleFileAndAssert } from './upload-helpers';

test('importa CSV com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(page, getFixtureFromEnvOrFactory('CSV_FILE_PATH', buildCsvFixture));
});
