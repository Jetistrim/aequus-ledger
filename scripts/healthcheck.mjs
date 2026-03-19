const frontendUrl = process.env.HEALTHCHECK_FRONTEND_URL || 'http://localhost:5173';
if (process.env.HEALTHCHECK_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const backendCandidates = [
  process.env.HEALTHCHECK_BACKEND_URL,
  'http://localhost:3001/api/health',
  `${frontendUrl.replace(/\/$/, '')}/api/health`,
].filter(Boolean);
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 90000);
const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS || 3000);

async function waitForHealthy(name, url, timeout, interval) {
  const deadline = Date.now() + timeout;
  let lastError = 'sem resposta';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[ok] ${name}: ${url}`);
        return;
      }

      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`${name} indisponivel em ${url} (${lastError})`);
}

async function main() {
  console.log('Verificando disponibilidade dos servicos...');

  let backendError;

  for (const backendUrl of backendCandidates) {
    try {
      await waitForHealthy('backend', backendUrl, timeoutMs, intervalMs);
      backendError = undefined;
      break;
    } catch (error) {
      backendError = error;
    }
  }

  if (backendError) {
    throw backendError;
  }

  await waitForHealthy('frontend', frontendUrl, timeoutMs, intervalMs);

  console.log('Ambiente pronto para uso.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});