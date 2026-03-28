import fs from 'fs/promises';

import { RuntimePaths, resolveRuntimePaths } from './runtimePaths';

const INSTANCE_METADATA_VERSION = 1;
const STARTUP_GRACE_PERIOD_MS = 30_000;
const HEALTHCHECK_TIMEOUT_MS = 1_500;

export interface ActiveInstanceMetadata {
  version: number;
  pid: number;
  appVersion: string;
  host: string;
  preferredPort: number;
  port: number;
  url: string;
  healthUrl: string;
  startedAt: string;
}

export interface InstanceLockAcquisition {
  acquired: boolean;
  metadata: ActiveInstanceMetadata | null;
  release?: () => Promise<void>;
}

/**
 * Persiste os metadados da instância ativa para descoberta de porta e liveness.
 */
export async function writeActiveInstanceMetadata(
  metadata: ActiveInstanceMetadata,
  runtimePaths: RuntimePaths = resolveRuntimePaths(),
): Promise<void> {
  await fs.mkdir(runtimePaths.runtimeRoot, { recursive: true });
  await fs.writeFile(runtimePaths.instanceFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
}

/**
 * Lê os metadados da instância ativa, quando existentes e válidos.
 */
export async function readActiveInstanceMetadata(
  runtimePaths: RuntimePaths = resolveRuntimePaths(),
): Promise<ActiveInstanceMetadata | null> {
  try {
    const raw = await fs.readFile(runtimePaths.instanceFile, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ActiveInstanceMetadata>;

    if (
      parsed.version !== INSTANCE_METADATA_VERSION
      || typeof parsed.pid !== 'number'
      || typeof parsed.appVersion !== 'string'
      || typeof parsed.host !== 'string'
      || typeof parsed.preferredPort !== 'number'
      || typeof parsed.port !== 'number'
      || typeof parsed.url !== 'string'
      || typeof parsed.healthUrl !== 'string'
      || typeof parsed.startedAt !== 'string'
    ) {
      return null;
    }

    return parsed as ActiveInstanceMetadata;
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

/**
 * Remove os metadados da instância ativa.
 */
export async function clearActiveInstanceMetadata(
  runtimePaths: RuntimePaths = resolveRuntimePaths(),
): Promise<void> {
  await removeFileIfExists(runtimePaths.instanceFile);
}

/**
 * Tenta adquirir o lock exclusivo da aplicação.
 *
 * @remarks
 * Quando encontra lock pré-existente, valida se a instância anunciada ainda está viva.
 * Se o lock estiver órfão, faz limpeza e tenta novamente uma vez.
 */
export async function acquireInstanceLock(
  runtimePaths: RuntimePaths = resolveRuntimePaths(),
  allowStaleCleanup = true,
): Promise<InstanceLockAcquisition> {
  await fs.mkdir(runtimePaths.runtimeRoot, { recursive: true });

  try {
    const handle = await fs.open(runtimePaths.lockFile, 'wx');
    await handle.writeFile(`${process.pid}\n`, 'utf8');

    return {
      acquired: true,
      metadata: null,
      release: async () => {
        await handle.close();
        await removeFileIfExists(runtimePaths.lockFile);
      },
    };
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode !== 'EEXIST') {
      throw error;
    }

    const metadata = await readActiveInstanceMetadata(runtimePaths);
    const isAlive = metadata
      ? await isInstanceAlive(metadata)
      : await isLockOwnerAlive(runtimePaths.lockFile);

    if (!isAlive && allowStaleCleanup) {
      await clearActiveInstanceMetadata(runtimePaths);
      await removeFileIfExists(runtimePaths.lockFile);
      return acquireInstanceLock(runtimePaths, false);
    }

    return {
      acquired: false,
      metadata,
    };
  }
}

/**
 * Verifica se os metadados apontam para uma instância ainda ativa.
 */
export async function isInstanceAlive(metadata: ActiveInstanceMetadata): Promise<boolean> {
  if (!isProcessAlive(metadata.pid)) {
    return false;
  }

  if (!metadata.healthUrl) {
    return true;
  }

  if (await isHealthcheckReady(metadata.healthUrl)) {
    return true;
  }

  const startedAt = Date.parse(metadata.startedAt);
  if (Number.isNaN(startedAt)) {
    return false;
  }

  return Date.now() - startedAt < STARTUP_GRACE_PERIOD_MS;
}

async function isLockOwnerAlive(lockFilePath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(lockFilePath, 'utf8');
    const pid = Number(raw.trim());
    if (!Number.isInteger(pid) || pid <= 0) {
      return false;
    }

    return isProcessAlive(pid);
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function isHealthcheckReady(healthUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

  try {
    const response = await fetch(healthUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function removeFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode !== 'ENOENT') {
      throw error;
    }
  }
}
