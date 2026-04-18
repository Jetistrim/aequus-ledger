import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function runGit(args, { allowFailure = false } = {}) {
  try {
    return execSync(`git ${args}`, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return '';
    }

    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr ?? '').trim() : '';
    throw new Error(stderr || `Falha ao executar: git ${args}`);
  }
}

const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = String(packageJson.version ?? '').trim();
const baseRevision = String(process.env['RELEASE_VERSION_BASE_REF'] ?? '').trim();

if (!version) {
  console.error('✖ [pre-push] package.json raiz sem campo version.');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`✖ [pre-push] Versao invalida no package.json raiz: ${version}`);
  process.exit(1);
}

const currentBranch = String(process.env['GITHUB_REF_NAME'] ?? '').trim()
  || runGit('branch --show-current', { allowFailure: true });
if (!currentBranch) {
  console.log('► [pre-push] Branch atual nao identificado. Ignorando checagem de versao duplicada.');
  process.exit(0);
}

const tag = `v${version}`;
console.log(`► [pre-push] Validando versao ${version} contra tags remotas...`);

runGit('fetch --force --tags origin');

const remoteTag = runGit(`ls-remote --tags origin refs/tags/${tag}`, { allowFailure: true });
if (!remoteTag) {
  console.log(`✔ [pre-push] Tag ${tag} ainda nao existe no remoto.`);
  process.exit(0);
}

if (baseRevision) {
  const basePackageJson = runGit(`show ${baseRevision}:package.json`, { allowFailure: true });
  if (!basePackageJson) {
    console.error(`✖ [pre-push] Nao foi possivel ler package.json em ${baseRevision} para comparar a versao.`);
    process.exit(1);
  }

  const baseVersion = String(JSON.parse(basePackageJson).version ?? '').trim();
  if (baseVersion === version) {
    console.log(`✔ [pre-push] ${baseRevision} ja usava a versao ${version}; validacao aprovada.`);
    process.exit(0);
  }

  console.error(`✖ [pre-push] A versao ${version} ja existe como tag ${tag} e o commit base ${baseRevision} estava em ${baseVersion || 'versao desconhecida'}.`);
  console.error('   Atualize o package.json raiz para uma nova versao antes de publicar em main.');
  process.exit(1);
}

const remoteBranchRef = runGit(`ls-remote --heads origin ${currentBranch}`, { allowFailure: true });
if (!remoteBranchRef) {
  console.log(`► [pre-push] Tag ${tag} ja existe, mas origin/${currentBranch} ainda nao existe. Permitindo criacao do branch.`);
  process.exit(0);
}

const [remoteBranchSha] = remoteBranchRef.split(/\s+/);
const remotePackageJson = runGit(`show ${remoteBranchSha}:package.json`, { allowFailure: true });
if (!remotePackageJson) {
  console.error(`✖ [pre-push] Nao foi possivel ler package.json em origin/${currentBranch} para comparar a versao.`);
  process.exit(1);
}

const remoteVersion = String(JSON.parse(remotePackageJson).version ?? '').trim();
if (remoteVersion === version) {
  console.log(`✔ [pre-push] origin/${currentBranch} ja usa a versao ${version}; push permitido.`);
  process.exit(0);
}

console.error(`✖ [pre-push] A versao ${version} ja existe como tag ${tag} e origin/${currentBranch} esta em ${remoteVersion || 'versao desconhecida'}.`);
console.error('   Atualize o package.json raiz para uma nova versao antes de fazer push.');
process.exit(1);