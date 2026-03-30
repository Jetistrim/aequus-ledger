import fs from 'fs';
import os from 'os';
import path from 'path';

export type RuntimeMode = 'local' | 'docker' | 'packaged' | 'portable';

export interface RuntimePaths {
  mode: RuntimeMode;
  runtimeRoot: string;
  dataDir: string;
  exportsDir: string;
  uploadsDir: string;
  databaseFile: string;
  databaseUrl: string;
  instanceFile: string;
  lockFile: string;
  preferredPort: number;
  portFallbackSpan: number;
  serverHost: string;
  publicHost: string;
}

const APP_NAME = 'ConciliacaoFinanceira';
const LOCAL_RUNTIME_DIR = '.runtime';
const DEFAULT_DATABASE_FILE = 'conciliacao.sqlite';
const DEFAULT_PREFERRED_PORT = 3001;
const DEFAULT_FALLBACK_SPAN = 20;
const INSTANCE_FILE_NAME = 'active-instance.json';
const LOCK_FILE_NAME = 'instance.lock';

let cachedRuntimePaths: RuntimePaths | null = null;

/**
 * Resolve os diretórios e parâmetros de runtime usados pelo backend.
 *
 * @remarks
 * O principal objetivo é evitar que caminhos relativos façam a aplicação gravar
 * dados em locais inesperados, especialmente em runtimes empacotados. Quando a
 * URL do SQLite vem relativa por variável de ambiente, ela é ancorada no diretório
 * de runtime apropriado para o modo atual, em vez de depender do diretório de execução.
 */
export function resolveRuntimePaths(): RuntimePaths {
  if (cachedRuntimePaths) {
    return cachedRuntimePaths;
  }

  const mode = detectRuntimeMode();
  const runtimeRoot = resolveRuntimeRoot(mode);
  const dataDir = resolveDirectoryOverride(process.env['APP_DATA_SUBDIR'], path.join(runtimeRoot, 'data'), runtimeRoot, mode);
  const exportsDir = resolveDirectoryOverride(process.env['EXPORTS_DIR'], path.join(runtimeRoot, 'exports'), runtimeRoot, mode);
  const uploadsDir = resolveDirectoryOverride(process.env['UPLOADS_DIR'], path.join(runtimeRoot, 'uploads'), runtimeRoot, mode);
  const databaseFile = resolveDatabaseFile(process.env['DATABASE_URL'], path.join(dataDir, DEFAULT_DATABASE_FILE), runtimeRoot, mode);

  cachedRuntimePaths = {
    mode,
    runtimeRoot,
    dataDir,
    exportsDir,
    uploadsDir,
    databaseFile,
    databaseUrl: toSqliteDatabaseUrl(databaseFile),
    instanceFile: path.join(runtimeRoot, INSTANCE_FILE_NAME),
    lockFile: path.join(runtimeRoot, LOCK_FILE_NAME),
    preferredPort: resolvePort(process.env['PORT'], DEFAULT_PREFERRED_PORT),
    portFallbackSpan: resolvePort(process.env['PORT_FALLBACK_SPAN'], DEFAULT_FALLBACK_SPAN),
    serverHost: process.env['HOST'] || (mode === 'docker' ? '0.0.0.0' : '127.0.0.1'),
    publicHost: process.env['PUBLIC_HOST'] || '127.0.0.1',
  };

  return cachedRuntimePaths;
}

/**
 * Aplica no ambiente os caminhos e parâmetros resolvidos para o runtime atual.
 */
export function applyRuntimeEnvironment(): RuntimePaths {
  const runtimePaths = resolveRuntimePaths();

  process.env['APP_RUNTIME_MODE'] = runtimePaths.mode;
  process.env['DATABASE_URL'] = runtimePaths.databaseUrl;
  process.env['EXPORTS_DIR'] = runtimePaths.exportsDir;
  process.env['UPLOADS_DIR'] = runtimePaths.uploadsDir;
  process.env['ACTIVE_INSTANCE_FILE'] = runtimePaths.instanceFile;
  process.env['ACTIVE_INSTANCE_LOCK_FILE'] = runtimePaths.lockFile;

  return runtimePaths;
}

/**
 * Garante a existência dos diretórios operacionais da aplicação.
 */
export function ensureRuntimeDirectories(runtimePaths: RuntimePaths = resolveRuntimePaths()): RuntimePaths {
  const directories = [
    runtimePaths.runtimeRoot,
    runtimePaths.dataDir,
    runtimePaths.exportsDir,
    runtimePaths.uploadsDir,
  ];

  for (const directory of directories) {
    fs.mkdirSync(directory, { recursive: true });
  }

  return runtimePaths;
}

/**
 * Limpa o cache do resolvedor para cenários de teste que trocam variáveis de ambiente.
 */
export function resetRuntimePathsForTests(): void {
  cachedRuntimePaths = null;
}

function detectRuntimeMode(): RuntimeMode {
  const explicitMode = process.env['APP_RUNTIME_MODE'];
  if (explicitMode === 'local' || explicitMode === 'docker' || explicitMode === 'packaged' || explicitMode === 'portable') {
    return explicitMode;
  }

  if (process.env['PORTABLE_RUNTIME'] === 'true') {
    return 'portable';
  }

  if (process.env['PACKAGED_RUNTIME'] === 'true') {
    return 'packaged';
  }

  if (process.env['DOCKER_RUNTIME'] === 'true') {
    return 'docker';
  }

  // Heurística secundária para compatibilidade quando não há sinal explícito.
  if (process.cwd() === '/app') {
    return 'docker';
  }

  return 'local';
}

function resolveRuntimeRoot(mode: RuntimeMode): string {
  const override = process.env['APP_DATA_DIR'];
  if (override) {
    return path.isAbsolute(override) ? override : path.resolve(process.cwd(), override);
  }

  if (mode === 'packaged') {
    return resolvePackagedRuntimeRoot();
  }

  if (mode === 'portable') {
    return path.resolve(process.cwd());
  }

  if (mode === 'docker') {
    return '/app';
  }

  return path.resolve(process.cwd(), LOCAL_RUNTIME_DIR);
}

function resolvePackagedRuntimeRoot(): string {
  if (process.platform === 'win32') {
    return path.join(process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local'), APP_NAME);
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
  }

  return path.join(process.env['XDG_DATA_HOME'] || path.join(os.homedir(), '.local', 'share'), APP_NAME);
}

function resolveDirectoryOverride(
  rawValue: string | undefined,
  fallbackDirectory: string,
  runtimeRoot: string,
  mode: RuntimeMode,
): string {
  if (!rawValue) {
    return fallbackDirectory;
  }

  if (path.isAbsolute(rawValue)) {
    return path.normalize(rawValue);
  }

  const anchor = (mode === 'packaged' || mode === 'portable') ? runtimeRoot : process.cwd();
  return path.resolve(anchor, rawValue);
}

function resolveDatabaseFile(
  rawDatabaseUrl: string | undefined,
  fallbackFile: string,
  runtimeRoot: string,
  mode: RuntimeMode,
): string {
  if (!rawDatabaseUrl) {
    return path.normalize(fallbackFile);
  }

  if (!rawDatabaseUrl.startsWith('file:')) {
    throw new Error('A aplicação suporta apenas SQLite via DATABASE_URL iniciando com file:.');
  }

  const rawTarget = rawDatabaseUrl.slice('file:'.length);
  if (!rawTarget) {
    return path.normalize(fallbackFile);
  }

  if (isAbsolutePathLike(rawTarget)) {
    return path.normalize(rawTarget);
  }

  const anchor = (mode === 'packaged' || mode === 'portable') ? runtimeRoot : process.cwd();
  return path.resolve(anchor, rawTarget);
}

function isAbsolutePathLike(filePath: string): boolean {
  return path.isAbsolute(filePath) || /^[A-Za-z]:[\\/]/.test(filePath);
}

function toSqliteDatabaseUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, '/')}`;
}

function resolvePort(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}
