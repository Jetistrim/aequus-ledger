import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const instanceFilePath = process.env.DEV_BACKEND_INSTANCE_FILE
  || path.join(process.cwd(), 'backend', '.runtime', 'active-instance.json');
const timeoutMs = Number(process.env.DEV_BACKEND_WAIT_TIMEOUT_MS || 120000);
const intervalMs = Number(process.env.DEV_BACKEND_WAIT_INTERVAL_MS || 1000);

async function waitForBackendInstance() {
  const startedAt = Date.now();
  let lastError = 'sem metadados de instância';

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const instance = readInstanceMetadata(instanceFilePath);
      if (instance?.healthUrl) {
        const response = await fetch(instance.healthUrl);
        if (response.ok) {
          return instance;
        }

        lastError = `status ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Backend não ficou pronto via ${instanceFilePath} (${lastError}).`);
}

function readInstanceMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.url !== 'string' || typeof parsed.healthUrl !== 'string') {
    return null;
  }

  return parsed;
}

function spawnFrontend(proxyTarget) {
  const isWindows = process.platform === 'win32';
  const npmCommand = 'npm';
  const child = spawn(
    npmCommand,
    ['--prefix', 'frontend', 'run', 'dev'],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: isWindows,
      env: {
        ...process.env,
        VITE_API_PROXY_TARGET: proxyTarget,
      },
    },
  );

  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

waitForBackendInstance()
  .then((instance) => {
    console.log(`Frontend apontando para ${instance.url}`);
    spawnFrontend(instance.url);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
