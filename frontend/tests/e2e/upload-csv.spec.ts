import { test } from '@playwright/test';
import { buildCsvFixture, uploadSingleFileAndAssert } from './upload-helpers';

test('importa CSV com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(page, buildCsvFixture());
});
