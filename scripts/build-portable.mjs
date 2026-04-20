/**
 * build-portable.mjs
 *
 * Prepara o diretório `portable/` com todos os artefatos necessários para
 * distribuir a aplicação como uma pasta portátil com Node.js embutido.
 * Deve ser executado no sistema operacional alvo (Windows x64).
 *
 * Fluxo:
 * 1.  Compila o backend (TypeScript → dist/).
 * 2.  Compila o frontend (Vite → dist/).
 * 3.  Copia o dist do backend para portable/.
 * 4.  Copia o dist do frontend para portable/dist/public/ (servido como SPA).
 * 5.  Copia schema.prisma e migrações para portable/prisma/.
 * 6.  Copia package.json e executa npm ci --omit=dev para deps de produção.
 * 7.  Gera o Prisma Client dentro de portable/node_modules/.
 * 8.  Copia o binário do Node.js atual para portable/runtime/node.exe.
 * 9.  Cria os launchers: start.bat e start.ps1.
 *
 * O diretório `portable/` é apagado e recriado a cada execução.
 * Execute "npm run zip:portable" após este script para gerar o ZIP de distribuição.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const portableDir = path.join(rootDir, 'portable');
const configDir = path.join(rootDir, 'config');
const portableSeedsManifestPath = path.join(configDir, 'portable-seeds.json');

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

function loadPortableSeedSelection() {
  if (!fs.existsSync(portableSeedsManifestPath)) {
    return fs.readdirSync(configDir)
      .filter((entry) => /^seed-.*\.json$/i.test(entry))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }

  const raw = fs.readFileSync(portableSeedsManifestPath, 'utf8');
  const parsed = JSON.parse(raw);
  const selectedSeeds = Array.isArray(parsed?.incluir) ? parsed.incluir : null;

  if (!selectedSeeds || selectedSeeds.length === 0) {
    throw new Error('config/portable-seeds.json deve conter um array "incluir" com ao menos um arquivo seed-*.json.');
  }

  const normalized = [...new Set(selectedSeeds.map((entry) => String(entry).trim()).filter(Boolean))];

  for (const fileName of normalized) {
    if (!/^seed-.*\.json$/i.test(fileName)) {
      throw new Error(`Arquivo inválido em config/portable-seeds.json: ${fileName}. Use apenas nomes seed-*.json.`);
    }

    const sourcePath = path.join(configDir, fileName);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Arquivo listado em config/portable-seeds.json não encontrado: ${fileName}`);
    }
  }

  return normalized;
}

function copyPortableSeedConfig(destDir) {
  if (!fs.existsSync(configDir)) {
    return;
  }

  const selectedSeeds = loadPortableSeedSelection();

  console.log(`\n=== Copiando config de seeds (${selectedSeeds.length} selecionado(s)) ===`);
  fs.mkdirSync(destDir, { recursive: true });

  for (const fileName of selectedSeeds) {
    fs.copyFileSync(path.join(configDir, fileName), path.join(destDir, fileName));
  }

  if (fs.existsSync(portableSeedsManifestPath)) {
    fs.copyFileSync(portableSeedsManifestPath, path.join(destDir, 'portable-seeds.json'));
  }
}

// ─── 0. Limpar portable anterior ──────────────────────────────────────────────
console.log('\n=== Limpando portable anterior ===');
if (fs.existsSync(portableDir)) {
  fs.rmSync(portableDir, { recursive: true, force: true });
}
fs.mkdirSync(portableDir, { recursive: true });

// ─── 1. Compilar backend ───────────────────────────────────────────────────────
console.log('\n=== Compilando backend ===');
run(`${npmCmd} run build`, { cwd: backendDir });

// ─── 2. Compilar frontend ──────────────────────────────────────────────────────
console.log('\n=== Compilando frontend ===');
run(`${npmCmd} run build`, { cwd: frontendDir });

// ─── 3. Copiar dist do backend para portable/ ─────────────────────────────────
console.log('\n=== Copiando dist do backend ===');
copyDir(path.join(backendDir, 'dist'), path.join(portableDir, 'dist'));

// ─── 4. Copiar dist do frontend para portable/dist/public/ ────────────────────
console.log('\n=== Copiando dist do frontend → portable/dist/public/ ===');
copyDir(path.join(frontendDir, 'dist'), path.join(portableDir, 'dist', 'public'));

// ─── 5. Copiar prisma (schema + migrações) ────────────────────────────────────
console.log('\n=== Copiando prisma ===');
copyDir(path.join(backendDir, 'prisma'), path.join(portableDir, 'prisma'));

// ─── 5.1. Copiar configuração de seed JSON ────────────────────────────────────
if (fs.existsSync(configDir)) {
  copyPortableSeedConfig(path.join(portableDir, 'config'));
}

// ─── 5.2. Copiar prisma.config.ts (Prisma 7) ──────────────────────────────────
const prismaConfigSrc = path.join(backendDir, 'prisma.config.ts');
if (fs.existsSync(prismaConfigSrc)) {
  fs.copyFileSync(prismaConfigSrc, path.join(portableDir, 'prisma.config.ts'));
}

// ─── 6. Copiar package.json e package-lock.json ───────────────────────────────
console.log('\n=== Copiando package.json ===');
fs.copyFileSync(
  path.join(backendDir, 'package.json'),
  path.join(portableDir, 'package.json'),
);
const lockFile = path.join(backendDir, 'package-lock.json');
if (fs.existsSync(lockFile)) {
  fs.copyFileSync(lockFile, path.join(portableDir, 'package-lock.json'));
}

// ─── 7. Instalar somente deps de produção ─────────────────────────────────────
console.log('\n=== Instalando deps de produção (npm ci --omit=dev) ===');
run(`${npmCmd} ci --omit=dev`, { cwd: portableDir });

// ─── 8. Gerar Prisma Client para esta plataforma ──────────────────────────────
console.log('\n=== Gerando Prisma Client ===');
run(
  `node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma`,
  { cwd: portableDir },
);

// ─── 9. Copiar prisma.config compilado (se existir) ───────────────────────────
const prismaConfigDist = path.join(backendDir, 'dist', 'prisma.config.js');
if (fs.existsSync(prismaConfigDist)) {
  fs.copyFileSync(prismaConfigDist, path.join(portableDir, 'prisma.config.js'));
}

// ─── 10. Copiar binário do Node.js ────────────────────────────────────────────
console.log('\n=== Copiando Node.js para portable/runtime/ ===');
const runtimeDir = path.join(portableDir, 'runtime');
fs.mkdirSync(runtimeDir, { recursive: true });

const nodeExe = process.execPath;
const nodeExt = process.platform === 'win32' ? '.exe' : '';
const nodeDest = path.join(runtimeDir, `node${nodeExt}`);
fs.copyFileSync(nodeExe, nodeDest);
console.log(`  ${nodeExe} → ${nodeDest}`);

// ─── 11. Criar launchers ──────────────────────────────────────────────────────
console.log('\n=== Criando launchers ===');

const startBat = `@echo off
cd /d "%~dp0"
echo Iniciando Conciliacao Financeira...
.\\runtime\\node.exe dist\\portable-entrypoint.js
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Erro ao iniciar. Pressione qualquer tecla para fechar.
  pause > nul
)
`;

const startPs1 = `Set-Location $PSScriptRoot
Write-Host 'Iniciando Conciliacao Financeira...'
& ".\\runtime\\node.exe" "dist\\portable-entrypoint.js"
`;

const startVbs = `Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = appDir
command = Chr(34) & appDir & "\\runtime\\node.exe" & Chr(34) & " " & Chr(34) & appDir & "\\dist\\portable-entrypoint.js" & Chr(34)
shell.Run command, 0, False
`;

fs.writeFileSync(path.join(portableDir, 'start.bat'), startBat, 'utf8');
fs.writeFileSync(path.join(portableDir, 'start.ps1'), startPs1, 'utf8');
fs.writeFileSync(path.join(portableDir, 'start.vbs'), startVbs, 'utf8');
console.log('  start.bat, start.ps1 e start.vbs criados.');

console.log(`\n✓ Pasta portátil pronta em: ${portableDir}`);
console.log('  Execute "npm run zip:portable" para gerar o ZIP de distribuição.\n');
