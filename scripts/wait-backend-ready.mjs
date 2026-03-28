import fs from 'node:fs';
import path from 'node:path';

const instanceFilePath = process.env.DEV_BACKEND_INSTANCE_FILE
  || path.join(process.cwd(), 'backend', '.runtime', 'active-instance.json');
const explicitHealthUrl = process.env.DEV_BACKEND_HEALTH_URL;
const timeoutMs = Number(process.env.DEV_BACKEND_WAIT_TIMEOUT_MS || 120000);
const intervalMs = Number(process.env.DEV_BACKEND_WAIT_INTERVAL_MS || 1000);

function readHealthUrlFromInstanceFile() {
  if (!fs.existsSync(instanceFilePath)) {
    return null;
  }

  const raw = fs.readFileSync(instanceFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  return typeof parsed?.healthUrl === 'string' ? parsed.healthUrl : null;
}

function resolveBackendHealthUrl() {
  return explicitHealthUrl || readHealthUrlFromInstanceFile() || 'http://localhost:3001/api/health';
}

async function waitForBackendReady() {
  const startedAt = Date.now();
  let lastError = 'sem resposta';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const backendHealthUrl = resolveBackendHealthUrl();
      const response = await fetch(backendHealthUrl);
      if (response.ok) {
        return backendHealthUrl;
      }

      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Backend não ficou pronto via ${instanceFilePath} (${lastError}).`);
}

waitForBackendReady()
  .then((backendHealthUrl) => {
    console.log(`Backend pronto: ${backendHealthUrl}`);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
