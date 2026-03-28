import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('runtime paths', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('resolve paths locais em .runtime por padrão', async () => {
    process.env.APP_RUNTIME_MODE = 'local';
    delete process.env.DATABASE_URL;
    delete process.env.APP_DATA_DIR;

    const { resolveRuntimePaths, resetRuntimePathsForTests } = await import('../src/runtime/runtimePaths');
    resetRuntimePathsForTests();

    const runtimePaths = resolveRuntimePaths();

    expect(runtimePaths.runtimeRoot).toBe(path.resolve(process.cwd(), '.runtime'));
    expect(runtimePaths.databaseFile).toBe(path.resolve(process.cwd(), '.runtime', 'data', 'conciliacao.sqlite'));
    expect(runtimePaths.databaseUrl).toBe(`file:${path.resolve(process.cwd(), '.runtime', 'data', 'conciliacao.sqlite').replace(/\\/g, '/')}`);
  });

  it('ancora database relativo no diretório persistente quando modo empacotado', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-runtime-'));
    process.env.APP_RUNTIME_MODE = 'packaged';
    process.env.APP_DATA_DIR = tempDir;
    process.env.DATABASE_URL = 'file:./prisma/dev.db';

    const { resolveRuntimePaths, resetRuntimePathsForTests } = await import('../src/runtime/runtimePaths');
    resetRuntimePathsForTests();

    const runtimePaths = resolveRuntimePaths();

    expect(runtimePaths.databaseFile).toBe(path.join(tempDir, 'prisma', 'dev.db'));
    expect(runtimePaths.databaseUrl).toBe(`file:${path.join(tempDir, 'prisma', 'dev.db').replace(/\\/g, '/')}`);
  });

  it('aplica diretórios resolvidos ao ambiente', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-runtime-env-'));
    process.env.APP_RUNTIME_MODE = 'packaged';
    process.env.APP_DATA_DIR = tempDir;
    delete process.env.DATABASE_URL;
    delete process.env.EXPORTS_DIR;
    delete process.env.UPLOADS_DIR;

    const { applyRuntimeEnvironment, resetRuntimePathsForTests } = await import('../src/runtime/runtimePaths');
    resetRuntimePathsForTests();

    const runtimePaths = applyRuntimeEnvironment();

    expect(process.env.DATABASE_URL).toBe(runtimePaths.databaseUrl);
    expect(process.env.EXPORTS_DIR).toBe(path.join(tempDir, 'exports'));
    expect(process.env.UPLOADS_DIR).toBe(path.join(tempDir, 'uploads'));
    expect(process.env.ACTIVE_INSTANCE_FILE).toBe(path.join(tempDir, 'active-instance.json'));
  });

  it('detecta modo docker via variável explícita', async () => {
    process.env.DOCKER_RUNTIME = 'true';
    delete process.env.APP_RUNTIME_MODE;

    const { resolveRuntimePaths, resetRuntimePathsForTests } = await import('../src/runtime/runtimePaths');
    resetRuntimePathsForTests();

    const runtimePaths = resolveRuntimePaths();
    expect(runtimePaths.mode).toBe('docker');
  });
});
