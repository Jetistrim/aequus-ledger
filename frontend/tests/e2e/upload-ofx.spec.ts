import { test } from '@playwright/test';
import { buildOfxFixture, uploadSingleFileAndAssert } from './upload-helpers';

test('importa OFX com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(page, buildOfxFixture());
});
