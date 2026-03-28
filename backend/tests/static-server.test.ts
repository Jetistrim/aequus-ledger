import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSpaFallback, mountStaticAssets } from '../src/runtime/staticServer';

const REAL_PUBLIC_DIR = path.resolve(__dirname, '..', 'src', 'public');
const REAL_INDEX_FILE = path.join(REAL_PUBLIC_DIR, 'index.html');

const originalExistsSync = fs.existsSync.bind(fs);
const originalStatSync = fs.statSync.bind(fs);

let existsSyncSpy: ReturnType<typeof vi.spyOn>;
let statSyncSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  existsSyncSpy = vi.spyOn(fs, 'existsSync');
  statSyncSpy = vi.spyOn(fs, 'statSync');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockDisk(hasDir: boolean, hasIndex: boolean) {
  existsSyncSpy.mockImplementation((p: fs.PathLike) => {
    const ps = p.toString();
    if (ps === REAL_PUBLIC_DIR) return hasDir;
    if (ps === REAL_INDEX_FILE) return hasIndex;
    return false;
  });

  statSyncSpy.mockImplementation((p: fs.PathLike) => {
    const ps = p.toString();
    if (ps === REAL_PUBLIC_DIR && hasDir) {
      return { isDirectory: () => true } as fs.Stats;
    }
    const err = Object.assign(new Error(`ENOENT: no such file or directory, stat '${ps}'`), {
      code: 'ENOENT',
    });
    throw err;
  });
}

function buildApp(hasDir: boolean, hasIndex: boolean) {
  mockDisk(hasDir, hasIndex);

  const app = express();
  const assetsOk = mountStaticAssets(app);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  const fallbackOk = mountSpaFallback(app);

  return { app, assetsOk, fallbackOk };
}

describe('mountStaticAssets', () => {
  it('retorna false quando dist/public/ não existe', () => {
    const { assetsOk } = buildApp(false, false);
    expect(assetsOk).toBe(false);
  });

  it('retorna true quando dist/public/ existe', () => {
    const { assetsOk } = buildApp(true, true);
    expect(assetsOk).toBe(true);
  });
});

describe('mountSpaFallback', () => {
  it('retorna false quando index.html não existe', () => {
    const { fallbackOk } = buildApp(true, false);
    expect(fallbackOk).toBe(false);
  });

  it('retorna true quando index.html existe', () => {
    const { fallbackOk } = buildApp(true, true);
    expect(fallbackOk).toBe(true);
  });

  it('não intercepta métodos não GET/HEAD', async () => {
    const { app } = buildApp(true, true);
    const res = await request(app)
      .post('/rota-spa')
      .set('accept', 'text/html')
      .send({ ok: true });

    expect(res.status).toBe(404);
  });

  it('não intercepta GET sem Accept text/html', async () => {
    const { app } = buildApp(true, true);
    const res = await request(app)
      .get('/rota-spa')
      .set('accept', 'application/json');

    expect(res.status).toBe(404);
  });
});

describe('integração real com pasta pública', () => {
  let hadPublicDir = false;
  let hadIndexFile = false;
  let indexBackup = '';

  beforeEach(() => {
    vi.restoreAllMocks();

    hadPublicDir = originalExistsSync(REAL_PUBLIC_DIR);
    hadIndexFile = originalExistsSync(REAL_INDEX_FILE);

    if (hadIndexFile) {
      indexBackup = fs.readFileSync(REAL_INDEX_FILE, 'utf8');
    }

    fs.mkdirSync(REAL_PUBLIC_DIR, { recursive: true });
    fs.writeFileSync(
      REAL_INDEX_FILE,
      '<!DOCTYPE html><html><body><h1>SPA REAL</h1></body></html>',
      'utf8',
    );
  });

  afterEach(() => {
    if (hadIndexFile) {
      fs.writeFileSync(REAL_INDEX_FILE, indexBackup, 'utf8');
    } else if (originalExistsSync(REAL_INDEX_FILE)) {
      fs.unlinkSync(REAL_INDEX_FILE);
    }

    if (!hadPublicDir && originalExistsSync(REAL_PUBLIC_DIR)) {
      fs.rmdirSync(REAL_PUBLIC_DIR);
    }
  });

  it('GET html em rota não-api retorna index.html real', async () => {
    const app = express();
    mountStaticAssets(app);
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    mountSpaFallback(app);

    const res = await request(app)
      .get('/pagina-qualquer')
      .set('accept', 'text/html');

    expect(res.status).toBe(200);
    expect(res.text).toContain('SPA REAL');
  });

  it('GET /api/health permanece JSON com fallback ativo', async () => {
    const app = express();
    mountStaticAssets(app);
    app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
    mountSpaFallback(app);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
