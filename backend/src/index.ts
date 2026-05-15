import 'dotenv/config';
import http from 'http';
import type { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';

import { createApp } from './app';
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';
import transacoesRoutes from './routes/transacoesRoutes';
import regrasRoutes from './routes/regrasRoutes';
import exportRoutes from './routes/exportRoutes';
import shutdownRoutes from './routes/shutdownRoutes';
import { exigirAutenticacao } from './middlewares/authMiddleware';
import { errorHandler } from './middlewares/errorHandler';
import { prisma } from './lib/prisma';
import {
  acquireInstanceLock,
  clearActiveInstanceMetadata,
  consumeBootstrapInstanceLock,
  type ActiveInstanceMetadata,
  isInstanceAlive,
  readActiveInstanceMetadata,
  writeActiveInstanceMetadata,
} from './runtime/instanceMetadata';
import {
  applyRuntimeEnvironment,
  ensureRuntimeDirectories,
  type RuntimePaths,
} from './runtime/runtimePaths';
import { mountStaticAssets, mountSpaFallback } from './runtime/staticServer';
import { registerShutdownHandler, clearShutdownHandler } from './services/shutdownService';
import { openBrowserToUrl } from './runtime/browserLauncher';

const runtimePaths = applyRuntimeEnvironment();
ensureRuntimeDirectories(runtimePaths);

const app = createApp();

// Static assets before API routes so concrete files are served first.
mountStaticAssets(app);

app.use('/api/auth', authRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', exigirAutenticacao);
app.use('/api/upload', uploadRoutes);
app.use('/api/transacoes', transacoesRoutes);
app.use('/api/regras', regrasRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/shutdown', exigirAutenticacao, shutdownRoutes);

// SPA fallback after API routes so /api/* is never intercepted.
mountSpaFallback(app);

app.use(errorHandler);

const server = http.createServer(app);

class ExistingInstanceDetectedError extends Error {
  constructor() {
    super('Instância ativa detectada durante startup.');
  }
}

void startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

/**
 * Inicializa o servidor HTTP com lock de instância e fallback automático de porta.
 */
async function startServer(): Promise<void> {
  const reservedRelease = consumeBootstrapInstanceLock();
  const lockAcquisition = reservedRelease
    ? { acquired: true, metadata: null, release: reservedRelease }
    : await acquireInstanceLock(runtimePaths);

  if (!lockAcquisition.acquired) {
    await handleExistingInstance(lockAcquisition.metadata);
    return;
  }

  const releaseLock = lockAcquisition.release;
  if (!releaseLock) {
    throw new Error('Falha ao adquirir lock da instância atual.');
  }

  let shutdownStarted = false;
  let releaseLockFn: (() => Promise<void>) | null = releaseLock;

  const shutdown = async (signal?: NodeJS.Signals) => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;

    try {
      await closeServer(server);
      await prisma.$disconnect();
    } catch (error) {
      console.error((error as Error).message);
    } finally {
      clearShutdownHandler();
      await clearActiveInstanceMetadata(runtimePaths);
      if (releaseLockFn) {
        await releaseLockFn();
        releaseLockFn = null;
      }
    }

    if (signal === 'SIGUSR2') {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(0);
  };

  registerShutdownHandler(() => shutdown('SIGTERM'));

  try {
    const resolvedPort = await listenWithFallback(server, runtimePaths);
    const instanceMetadata = buildInstanceMetadata(resolvedPort, runtimePaths);
    await writeActiveInstanceMetadata(instanceMetadata);

    console.log(`Servidor rodando em ${instanceMetadata.url}`);

    if (runtimePaths.mode === 'packaged' || runtimePaths.mode === 'portable') {
      openBrowserToUrl(instanceMetadata.url);
    }

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
    process.on('SIGUSR2', () => {
      void shutdown('SIGUSR2');
    });
  } catch (error) {
    clearShutdownHandler();
    if (error instanceof ExistingInstanceDetectedError) {
      if (releaseLockFn) {
        await releaseLockFn();
        releaseLockFn = null;
      }
      process.exit(0);
      return;
    }

    await clearActiveInstanceMetadata(runtimePaths);
    if (releaseLockFn) {
      await releaseLockFn();
      releaseLockFn = null;
    }
    throw error;
  }
}

/**
 * Tenta subir o servidor na porta preferida e faz fallback para outras livres.
 *
 * @remarks
 * O fallback sequencial preserva previsibilidade em logs e troubleshooting. Se toda
 * a faixa configurada estiver indisponível, o sistema recorre a `0` para que o SO
 * selecione uma porta efêmera livre e a aplicação ainda suba.
 */
async function listenWithFallback(serverInstance: http.Server, paths: RuntimePaths): Promise<number> {
  const attemptedPorts = new Set<number>();
  const preferredPort = paths.preferredPort;
  const fallbackCandidates = Array.from({ length: paths.portFallbackSpan }, (_value, index) => preferredPort + index + 1);
  const candidates = [preferredPort, ...fallbackCandidates, 0];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    if (attemptedPorts.has(candidate)) {
      continue;
    }

    attemptedPorts.add(candidate);

    try {
      const port = await attemptListen(serverInstance, candidate, paths.serverHost);
      if (candidate !== preferredPort) {
        console.warn(`Porta ${preferredPort} indisponível. Runtime ativo em ${buildInstanceMetadata(port, paths).url}.`);
      }
      return port;
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;
      if (errorCode !== 'EADDRINUSE') {
        throw error;
      }

      if (candidate === preferredPort && await handlePortConflictWithExistingInstance(paths)) {
        throw new ExistingInstanceDetectedError();
      }

      lastError = error as Error;
    }
   }

   throw lastError || new Error('Não foi possível encontrar uma porta livre para iniciar o servidor.');
 }

function attemptListen(serverInstance: http.Server, port: number, host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const handleError = (error: Error) => {
      serverInstance.off('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      serverInstance.off('error', handleError);
      const address = serverInstance.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Falha ao resolver a porta efetiva do servidor.'));
        return;
      }

      resolve((address as AddressInfo).port);
    };

    serverInstance.once('error', handleError);
    serverInstance.once('listening', handleListening);
    serverInstance.listen(port, host);
  });
}

async function handlePortConflictWithExistingInstance(paths: RuntimePaths): Promise<boolean> {
  if (paths.mode !== 'packaged' && paths.mode !== 'portable') {
    return false;
  }

  const metadata = await readActiveInstanceMetadata(paths);
  if (!metadata?.url) {
    return false;
  }

  const alive = await isInstanceAlive(metadata);
  if (!alive) {
    return false;
  }

  console.log(`Instância já está em execução em ${metadata.url}.`);
  openBrowserToUrl(metadata.url);
  return true;
}

function buildInstanceMetadata(port: number, paths: RuntimePaths): ActiveInstanceMetadata {
  const url = `http://${paths.publicHost}:${port}`;
  return {
    version: 1,
    pid: process.pid,
    appVersion: resolveAppVersion(),
    host: paths.publicHost,
    preferredPort: paths.preferredPort,
    port,
    url,
    healthUrl: `${url}/api/health`,
    startedAt: new Date().toISOString(),
  };
}

function resolveAppVersion(): string {
  const envVersion = process.env['npm_package_version'];
  if (envVersion) {
    return envVersion;
  }

  try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (typeof parsed.version === 'string' && parsed.version.length > 0) {
      return parsed.version;
    }
  } catch {
    // Ignora e retorna fallback.
  }

  return 'unknown';
}

async function handleExistingInstance(existingMetadata: ActiveInstanceMetadata | null): Promise<void> {
  const metadata = existingMetadata || await readActiveInstanceMetadata(runtimePaths);

  if (metadata?.url) {
    console.log(`Instância já está em execução em ${metadata.url}.`);
    if (runtimePaths.mode === 'packaged' || runtimePaths.mode === 'portable') {
      openBrowserToUrl(metadata.url);
    }
  } else {
    console.log('Instância já está em execução.');
  }

  process.exit(0);
}

function closeServer(serverInstance: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    serverInstance.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export default app;
