const backendHealthUrl = process.env.DEV_BACKEND_HEALTH_URL || 'http://localhost:3001/api/health';
const timeoutMs = Number(process.env.DEV_BACKEND_WAIT_TIMEOUT_MS || 120000);
const intervalMs = Number(process.env.DEV_BACKEND_WAIT_INTERVAL_MS || 1000);

async function waitForBackendReady() {
  const startedAt = Date.now();
  let lastError = 'sem resposta';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(backendHealthUrl);
      if (response.ok) {
        return;
      }

      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Backend não ficou pronto em ${backendHealthUrl} (${lastError}).`);
}

waitForBackendReady()
  .then(() => {
    console.log(`Backend pronto: ${backendHealthUrl}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
