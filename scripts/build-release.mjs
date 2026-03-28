/**
 * build-release.mjs
 *
 * Prepara o diretório `release/` com todos os artefatos necessários para
 * gerar o executável caxa. Deve ser executado no sistema operacional alvo
 * (não há cross-compilation confiável com módulos nativos como better-sqlite3).
 *
 * Fluxo:
 * 1. Compila o backend (TypeScript → dist/).
 * 2. Compila o frontend (Vite → dist/).
 * 3. Copia o dist do backend para release/.
 * 4. Copia o dist do frontend para release/dist/public/ (servido como SPA).
 * 5. Copia schema.prisma e migrações para release/prisma/.
 * 6. Copia package.json e executa npm ci --omit=dev para deps de produção.
 * 7. Gera o Prisma Client dentro de release/node_modules/.
 *
 * O diretório `release/` é apagado e recriado a cada execução.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const releaseDir = path.join(rootDir, 'release');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, options = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── 0. Limpar release anterior ───────────────────────────────────────────────
console.log('\n=== Limpando release anterior ===');
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

// ─── 1. Compilar backend ───────────────────────────────────────────────────────
console.log('\n=== Compilando backend ===');
run(`${npmCmd} run build`, { cwd: backendDir });

// ─── 2. Compilar frontend ──────────────────────────────────────────────────────
console.log('\n=== Compilando frontend ===');
run(`${npmCmd} run build`, { cwd: frontendDir });

// ─── 3. Copiar dist do backend para release/ ──────────────────────────────────
console.log('\n=== Copiando dist do backend ===');
copyDir(path.join(backendDir, 'dist'), path.join(releaseDir, 'dist'));

// ─── 4. Copiar dist do frontend para release/dist/public/ ─────────────────────
console.log('\n=== Copiando dist do frontend → release/dist/public/ ===');
copyDir(path.join(frontendDir, 'dist'), path.join(releaseDir, 'dist', 'public'));

// ─── 5. Copiar prisma (schema + migrações) ────────────────────────────────────
console.log('\n=== Copiando prisma ===');
copyDir(path.join(backendDir, 'prisma'), path.join(releaseDir, 'prisma'));

// ─── 6. Copiar package.json e package-lock.json ───────────────────────────────
console.log('\n=== Copiando package.json ===');
fs.copyFileSync(
  path.join(backendDir, 'package.json'),
  path.join(releaseDir, 'package.json'),
);
const lockFile = path.join(backendDir, 'package-lock.json');
if (fs.existsSync(lockFile)) {
  fs.copyFileSync(lockFile, path.join(releaseDir, 'package-lock.json'));
}

// ─── 7. Instalar somente deps de produção ─────────────────────────────────────
console.log('\n=== Instalando deps de produção (npm ci --omit=dev) ===');
run(`${npmCmd} ci --omit=dev`, { cwd: releaseDir });

// ─── 8. Gerar Prisma Client para esta plataforma ──────────────────────────────
console.log('\n=== Gerando Prisma Client ===');
run(
  `node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma`,
  { cwd: releaseDir },
);

// ─── 9. Copiar prisma.config compilado (se existir) ───────────────────────────
const prismaConfigDist = path.join(backendDir, 'dist', 'prisma.config.js');
if (fs.existsSync(prismaConfigDist)) {
  fs.copyFileSync(prismaConfigDist, path.join(releaseDir, 'prisma.config.js'));
}

console.log(`\n✓ Release pronto em: ${releaseDir}`);
console.log('  Execute "npm run package:caxa" para gerar o executável.\n');
