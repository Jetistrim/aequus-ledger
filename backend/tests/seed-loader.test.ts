import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { carregarRegrasDosJson } from '../src/seed';

const createdDirs: string[] = [];

function createTempConfigDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seed-loader-'));
  createdDirs.push(dir);
  return dir;
}

afterEach(() => {
  delete process.env['SEED_CONFIG_DIR'];

  for (const dir of createdDirs.splice(0, createdDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('seed loader', () => {
  it('carrega todos os arquivos seed-*.json do diretorio configurado', () => {
    const configDir = createTempConfigDir();

    fs.writeFileSync(
      path.join(configDir, 'seed-zeta.json'),
      JSON.stringify({
        regras: [{ palavraChave: 'REGRA_ZETA', categoria: 'EMPRESA', subCategoria: 'Zeta', prioridade: 1 }],
      }),
      'utf8',
    );

    fs.writeFileSync(
      path.join(configDir, 'seed-alpha.json'),
      JSON.stringify({
        regras: [{ palavraChave: 'REGRA_ALPHA', categoria: 'PESSOAL', subCategoria: 'Alpha', prioridade: 2 }],
      }),
      'utf8',
    );

    fs.writeFileSync(
      path.join(configDir, 'outra-config.json'),
      JSON.stringify({
        regras: [{ palavraChave: 'IGNORADA', categoria: 'EMPRESA', subCategoria: 'Nao deve carregar', prioridade: 0 }],
      }),
      'utf8',
    );

    process.env['SEED_CONFIG_DIR'] = configDir;

    const regras = carregarRegrasDosJson();

    expect(regras.map((regra) => regra.palavraChave)).toEqual(['REGRA_ALPHA', 'REGRA_ZETA']);
  });

  it('usa fallback para config do projeto quando o diretorio customizado nao tem seeds', () => {
    const configDir = createTempConfigDir();
    process.env['SEED_CONFIG_DIR'] = configDir;

    const regras = carregarRegrasDosJson();
    expect(regras.length).toBeGreaterThan(0);
  });
});
