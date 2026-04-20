/**
 * zip-portable.mjs
 *
 * Compacta o diretório `portable/` em um arquivo ZIP de distribuição.
 * Requer que "npm run build:portable" tenha sido executado antes.
 *
 * Saída: artifacts/conciliacao-portable-<versão>-win-x64.zip
 *
 * Usa PowerShell + .NET ZipFile.CreateFromDirectory para evitar falhas do
 * Compress-Archive com árvores grandes de dependências no Windows.
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

function resolveWritableZipPath(preferredPath) {
  if (!fs.existsSync(preferredPath)) {
    return preferredPath;
  }

  try {
    fs.rmSync(preferredPath);
    return preferredPath;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code !== 'EBUSY' && code !== 'EPERM') {
      throw error;
    }

    const parsed = path.parse(preferredPath);
    const fallbackName = `${parsed.name}-locked-${Date.now()}${parsed.ext}`;
    const fallbackPath = path.join(parsed.dir, fallbackName);
    console.warn(`ZIP de destino bloqueado em ${preferredPath}. Gerando artefato alternativo em ${fallbackPath}.`);
    return fallbackPath;
  }
}

const outputZipPath = resolveWritableZipPath(zipPath);
const outputZipName = path.basename(outputZipPath);

console.log(`\n=== Compactando portable/ → artifacts/${outputZipName} ===`);

if (process.platform !== 'win32') {
  console.error('Este script usa PowerShell + .NET ZipFile e só funciona no Windows.');
  console.error('Para gerar o ZIP em outro SO, use uma ferramenta como "zip" ou "7z".');
  process.exit(1);
}

// Usa ZipFile.CreateFromDirectory para empacotar o conteúdo de portable/
// diretamente, sem depender do Compress-Archive.
const psCommand = [
  `Add-Type -AssemblyName System.IO.Compression; Add-Type -AssemblyName System.IO.Compression.FileSystem`,
  `$sourceRoot = [System.IO.Path]::GetFullPath('${portableDir}')`,
  `$destinationPath = [System.IO.Path]::GetFullPath('${outputZipPath}')`,
  `if (Test-Path $destinationPath) { Remove-Item -LiteralPath $destinationPath -Force }`,
  `[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceRoot, $destinationPath)`,
].join('; ');

execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });

const stats = fs.statSync(outputZipPath);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

console.log(`\n✓ ZIP gerado: artifacts/${outputZipName} (${sizeMb} MB)\n`);
