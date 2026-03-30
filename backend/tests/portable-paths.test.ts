import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  resetRuntimePathsForTests,
  resolveRuntimePaths,
} from '../src/runtime/runtimePaths';

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const original: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    original[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(original)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

describe('runtimePaths — modo portable', () => {
  beforeEach(() => {
    resetRuntimePathsForTests();
  });

  afterEach(() => {
    resetRuntimePathsForTests();
    delete process.env['PORTABLE_RUNTIME'];
    delete process.env['APP_RUNTIME_MODE'];
    delete process.env['APP_DATA_DIR'];
  });

  it('detecta modo portable via PORTABLE_RUNTIME=true', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', PACKAGED_RUNTIME: undefined, DOCKER_RUNTIME: undefined, APP_RUNTIME_MODE: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.mode).toBe('portable');
    });
  });

  it('detecta modo portable via APP_RUNTIME_MODE=portable', () => {
    withEnv({ APP_RUNTIME_MODE: 'portable', PORTABLE_RUNTIME: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.mode).toBe('portable');
    });
  });

  it('PORTABLE_RUNTIME tem prioridade sobre PACKAGED_RUNTIME', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', PACKAGED_RUNTIME: 'true', APP_RUNTIME_MODE: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.mode).toBe('portable');
    });
  });

  it('runtimeRoot aponta para process.cwd() no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.runtimeRoot).toBe(path.resolve(process.cwd()));
    });
  });

  it('dataDir fica em <cwd>/data no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.dataDir).toBe(path.join(path.resolve(process.cwd()), 'data'));
    });
  });

  it('exportsDir fica em <cwd>/exports no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined, EXPORTS_DIR: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.exportsDir).toBe(path.join(path.resolve(process.cwd()), 'exports'));
    });
  });

  it('uploadsDir fica em <cwd>/uploads no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined, UPLOADS_DIR: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.uploadsDir).toBe(path.join(path.resolve(process.cwd()), 'uploads'));
    });
  });

  it('databaseFile fica em <cwd>/data/conciliacao.sqlite no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined, DATABASE_URL: undefined }, () => {
      const paths = resolveRuntimePaths();
      const expected = path.join(path.resolve(process.cwd()), 'data', 'conciliacao.sqlite');
      expect(paths.databaseFile).toBe(expected);
    });
  });

  it('databaseUrl usa prefixo file: no modo portable', () => {
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: undefined, DATABASE_URL: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.databaseUrl).toMatch(/^file:/);
    });
  });

  it('APP_DATA_DIR absoluto é respeitado no modo portable', () => {
    const customDir = path.join(os.tmpdir(), 'cf-portable-test');
    withEnv({ PORTABLE_RUNTIME: 'true', APP_RUNTIME_MODE: undefined, APP_DATA_DIR: customDir }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.runtimeRoot).toBe(customDir);
    });
  });

  it('modo packaged ainda funciona com PACKAGED_RUNTIME=true', () => {
    withEnv({ PACKAGED_RUNTIME: 'true', PORTABLE_RUNTIME: undefined, APP_RUNTIME_MODE: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.mode).toBe('packaged');
    });
  });

  it('modo local não é impactado pela ausência de PORTABLE_RUNTIME', () => {
    withEnv({ PORTABLE_RUNTIME: undefined, PACKAGED_RUNTIME: undefined, DOCKER_RUNTIME: undefined, APP_RUNTIME_MODE: undefined }, () => {
      const paths = resolveRuntimePaths();
      expect(paths.mode).toBe('local');
    });
  });
});
