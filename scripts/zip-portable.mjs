/**
 * zip-portable.mjs
 *
 * Compacta o diretório `portable/` em um arquivo ZIP de distribuição.
 * Requer que "npm run build:portable" tenha sido executado antes.
 *
 * Saída: artifacts/conciliacao-portable-<versão>-win-x64.zip
 *
 * Usa PowerShell Compress-Archive (disponível no Windows 10+ sem dependências extras).
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const portableDir = path.join(rootDir, 'portable');
const artifactsDir = path.join(rootDir, 'artifacts');

if (!fs.existsSync(portableDir)) {
  console.error('Erro: diretório portable/ não encontrado.');
  console.error('Execute "npm run build:portable" antes de "npm run zip:portable".');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

fs.mkdirSync(artifactsDir, { recursive: true });

const zipName = `conciliacao-portable-${version}-win-x64.zip`;
const zipPath = path.join(artifactsDir, zipName);

// Remove ZIP anterior com o mesmo nome, se existir.
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}

console.log(`\n=== Compactando portable/ → artifacts/${zipName} ===`);

if (process.platform !== 'win32') {
  console.error('Este script usa PowerShell Compress-Archive e só funciona no Windows.');
  console.error('Para gerar o ZIP em outro SO, use uma ferramenta como "zip" ou "7z".');
  process.exit(1);
}

// PowerShell Compress-Archive: compacta o conteúdo de portable/ diretamente
// (sem criar uma pasta-pai adicional dentro do ZIP).
const psCommand = [
  `$src = Get-ChildItem -Path '${portableDir}' | Select-Object -ExpandProperty FullName`,
  `Compress-Archive -Path $src -DestinationPath '${zipPath}' -CompressionLevel Optimal`,
].join('; ');

execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });

const stats = fs.statSync(zipPath);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

console.log(`\n✓ ZIP gerado: artifacts/${zipName} (${sizeMb} MB)\n`);
