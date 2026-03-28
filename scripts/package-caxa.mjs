/**
 * package-caxa.mjs
 *
 * Empacota o diretório `release/` gerado por `build-release.mjs` num único
 * executável autossuficiente usando caxa.
 *
 * Pré-requisito: executar `npm run build:release` antes deste script.
 *
 * Caxa extrai o conteúdo para `os.tmpdir()/caxa/<hash>/` na primeira execução
 * e reutiliza essa extração em execuções subsequentes com o mesmo hash. Os dados
 * persistentes da aplicação (banco SQLite, uploads, exports) são gravados no
 * diretório de dados do usuário pela plataforma, **nunca** no diretório de
 * extração temporário.
 *
 * Saída: `artifacts/conciliacao-financeira[.exe]`
 *
 * Nota: caxa está arquivado/deprecated. A versão é fixada no package.json raiz
 * para garantir reprodutibilidade do build.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const artifactsDir = path.join(rootDir, 'artifacts');

if (!fs.existsSync(releaseDir)) {
  console.error('Diretório release/ não encontrado. Execute "npm run build:release" primeiro.');
  process.exit(1);
}

fs.mkdirSync(artifactsDir, { recursive: true });

const ext = process.platform === 'win32' ? '.exe' : '';
const outputName = `conciliacao-financeira${ext}`;
const outputPath = path.join(artifactsDir, outputName);

// O entrypoint está em dist/packaged-entrypoint.js dentro do diretório
// extraído pelo caxa. O símbolo {{caxa}} é substituído pelo caxa pelo caminho
// de extração em tempo de execução.
const entrypoint = '{{caxa}}/dist/packaged-entrypoint.js';

// Exclusões do pacote: reduzem o tamanho e evitam incluir artefatos inúteis.
const excludes = [
  '--exclude', '**/*.map',
  '--exclude', '**/*.d.ts',
  '--exclude', '**/test/**',
  '--exclude', '**/tests/**',
  '--exclude', '**/__tests__/**',
  '--exclude', '**/.git/**',
].join(' ');

const caxaBin = path.join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'caxa.cmd' : 'caxa');
const nodeInCaxa = '{{caxa}}/node_modules/.bin/node';

const command = [
  `"${caxaBin}"`,
  `--input "${releaseDir}"`,
  `--output "${outputPath}"`,
  excludes,
  `--`,
  `"${nodeInCaxa}"`,
  `"${entrypoint}"`,
].join(' ');

console.log(`\n=== Empacotando com caxa ===`);
console.log(`Input:  ${releaseDir}`);
console.log(`Output: ${outputPath}`);
console.log(`\n> ${command}\n`);

execSync(command, { stdio: 'inherit', cwd: rootDir });

const stats = fs.statSync(outputPath);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
console.log(`\n✓ Executável gerado: ${outputPath} (${sizeMb} MB)\n`);
