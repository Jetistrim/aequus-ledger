import { test } from '@playwright/test';
import { buildOfxFixture, getFixtureFromEnvOrFactory, uploadSingleFileAndAssert } from './upload-helpers';

test('importa OFX com sucesso', async ({ page }) => {
  await uploadSingleFileAndAssert(page, getFixtureFromEnvOrFactory('OFX_FILE_PATH', buildOfxFixture));
});
