/**
 * Entrypoint da distribuição portátil (pasta ZIP com Node embutido).
 *
 * Este módulo é o ponto de entrada **exclusivo do runtime portátil**; ele não
 * é usado em desenvolvimento local nem em Docker. Responsabilidades:
 *
 * 1. Sinalizar o modo portátil para o resolvedor de runtime (`PORTABLE_RUNTIME=true`).
 * 2. Resolver e persistir os diretórios de dados dentro da própria pasta portátil.
 * 3. Aplicar migrações pendentes do SQLite antes de qualquer operação no banco.
 * 4. Semear as regras iniciais no startup (seed idempotente).
 * 5. Delegar o bootstrap do servidor para `index.ts`, que cuida de lock de
 *    instância, seleção de porta, abertura do navegador e bandeja do sistema.
 *
 * @remarks
 * Executado como: `runtime\node.exe dist\portable-entrypoint.js`
 * (iniciado pelo launcher start.bat / start.ps1 na raiz da pasta portátil)
 *
 * Os dados (SQLite, exports, uploads) ficam em `data/` dentro da pasta portátil,
 * portáveis junto com ela. Copiar a pasta inteira preserva todos os dados.
 */

// Deve ser a primeira linha executada — antes de qualquer require/import que
// acione applyRuntimeEnvironment() — para que o resolvedor detecte o modo
// correto na primeira chamada.
process.env['PORTABLE_RUNTIME'] = 'true';

import 'dotenv/config';
import path from 'path';
import { spawnSync } from 'child_process';
import { openBrowserToUrl } from './runtime/browserLauncher';
import {
  acquireInstanceLock,
  consumeBootstrapInstanceLock,
  readActiveInstanceMetadata,
  reserveBootstrapInstanceLock,
} from './runtime/instanceMetadata';
import { applyRuntimeEnvironment, ensureRuntimeDirectories } from './runtime/runtimePaths';

const runtimePaths = applyRuntimeEnvironment();
ensureRuntimeDirectories(runtimePaths);

/**
 * Caminho raiz da pasta portátil.
 * Este arquivo fica em `dist/`, portanto o pai (`..`) é a raiz da pasta.
 */
const packageRoot = path.resolve(__dirname, '..');

/**
 * Executa uma etapa de setup de forma síncrona.
 * Encerra o processo com código de falha se o comando não terminar com status 0.
 */
function runStep(label: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const startedAt = Date.now();
  console.log(`[setup] Iniciando: ${label}`);

  const result = spawnSync(process.execPath, args, {
    env: { ...process.env, ...env },
    stdio: 'inherit',
    cwd: packageRoot,
  });

  const elapsedMs = Date.now() - startedAt;

  if (result.status !== 0) {
    console.error(`[setup] Falha em "${label}" após ${elapsedMs}ms. Verifique os logs acima.`);
    process.exit(result.status ?? 1);
  }

  console.log(`[setup] Concluído: ${label} (${elapsedMs}ms)`);
}

async function guardPortableInstance(): Promise<void> {
  const lockAcquisition = await acquireInstanceLock(runtimePaths);

  if (lockAcquisition.acquired) {
    reserveBootstrapInstanceLock(lockAcquisition.release);
    return;
  }

  const metadata = lockAcquisition.metadata || await readActiveInstanceMetadata(runtimePaths);

  if (metadata?.url) {
    console.log(`Instância já está em execução em ${metadata.url}.`);
    openBrowserToUrl(metadata.url);
  } else {
    console.log('Instância já está em execução.');
  }

  process.exit(0);
}

void main().catch(async (error) => {
  const release = consumeBootstrapInstanceLock();
  await release?.();
  console.error((error as Error).message);
  process.exit(1);
});

async function main(): Promise<void> {
  await guardPortableInstance();

  // 1. Aplicar migrações do SQLite no diretório de dados da pasta portátil.
  //    O schema.prisma está na raiz da pasta; o DATABASE_URL já foi normalizado
  //    para o caminho persistente dentro de data/.
  const prismaScript = path.join(packageRoot, 'node_modules', 'prisma', 'build', 'index.js');
  const schemaPath = path.join(packageRoot, 'prisma', 'schema.prisma');

  runStep('prisma migrate deploy', [
    prismaScript,
    'migrate',
    'deploy',
    '--schema',
    schemaPath,
  ], {
    DATABASE_URL: runtimePaths.databaseUrl,
  });

  // 2. Semear regras iniciais em todo startup.
  //    O seed é idempotente por design (upsert), então não cria duplicatas.
  const seedScript = path.join(packageRoot, 'dist', 'seed.js');
  runStep('prisma seed', [seedScript], {
    DATABASE_URL: runtimePaths.databaseUrl,
  });

  // 3. Iniciar o servidor; a partir daqui o fluxo continua em index.ts.
  //    Como o modo portátil já foi sinalizado via PORTABLE_RUNTIME=true e o cache
  //    de runtimePaths já está preenchido, o servidor usará os mesmos caminhos.
  console.log('[setup] Iniciando bootstrap do servidor...');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./index');
}
