import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('instance metadata', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('persiste e remove os metadados da instância ativa', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-instance-'));
    process.env.APP_RUNTIME_MODE = 'packaged';
    process.env.APP_DATA_DIR = tempDir;

    const runtimeModule = await import('../src/runtime/runtimePaths');
    const instanceModule = await import('../src/runtime/instanceMetadata');
    runtimeModule.resetRuntimePathsForTests();

    const runtimePaths = runtimeModule.resolveRuntimePaths();
    const metadata = {
      version: 1,
      pid: process.pid,
      appVersion: '2.0.1',
      host: '127.0.0.1',
      preferredPort: 3001,
      port: 3005,
      url: 'http://127.0.0.1:3005',
      healthUrl: 'http://127.0.0.1:3005/api/health',
      startedAt: new Date().toISOString(),
    };

    await instanceModule.writeActiveInstanceMetadata(metadata, runtimePaths);
    await expect(instanceModule.readActiveInstanceMetadata(runtimePaths)).resolves.toEqual(metadata);

    await instanceModule.clearActiveInstanceMetadata(runtimePaths);
    await expect(instanceModule.readActiveInstanceMetadata(runtimePaths)).resolves.toBeNull();
  });

  it('recupera lock órfão antes de adquirir a instância', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-lock-'));
    process.env.APP_RUNTIME_MODE = 'packaged';
    process.env.APP_DATA_DIR = tempDir;

    const runtimeModule = await import('../src/runtime/runtimePaths');
    const instanceModule = await import('../src/runtime/instanceMetadata');
    runtimeModule.resetRuntimePathsForTests();

    const runtimePaths = runtimeModule.resolveRuntimePaths();
    fs.mkdirSync(runtimePaths.runtimeRoot, { recursive: true });
    fs.writeFileSync(runtimePaths.lockFile, '999999\n', 'utf8');

    const acquisition = await instanceModule.acquireInstanceLock(runtimePaths);

    expect(acquisition.acquired).toBe(true);
    expect(typeof acquisition.release).toBe('function');

    await acquisition.release?.();

    expect(fs.existsSync(runtimePaths.lockFile)).toBe(false);
  });

  it('permite reservar e consumir o lock adquirido no bootstrap', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conciliacao-bootstrap-lock-'));
    process.env.APP_RUNTIME_MODE = 'packaged';
    process.env.APP_DATA_DIR = tempDir;

    const runtimeModule = await import('../src/runtime/runtimePaths');
    const instanceModule = await import('../src/runtime/instanceMetadata');
    runtimeModule.resetRuntimePathsForTests();

    const runtimePaths = runtimeModule.resolveRuntimePaths();
    const acquisition = await instanceModule.acquireInstanceLock(runtimePaths);

    expect(acquisition.acquired).toBe(true);
    expect(typeof acquisition.release).toBe('function');

    instanceModule.reserveBootstrapInstanceLock(acquisition.release);

    const reservedRelease = instanceModule.consumeBootstrapInstanceLock();
    expect(typeof reservedRelease).toBe('function');
    expect(instanceModule.consumeBootstrapInstanceLock()).toBeNull();

    await reservedRelease?.();

    expect(fs.existsSync(runtimePaths.lockFile)).toBe(false);
  });
});
