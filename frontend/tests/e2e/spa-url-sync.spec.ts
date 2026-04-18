import { BrowserContext, Page, expect, test } from '@playwright/test';
import { abrirTelaUpload, buildCsvFixture } from './upload-helpers';

const BASE_URL = 'http://localhost:5173';

interface MockTransacoesOptions {
  totalRegistros?: number;
  totalIndefinidos?: number;
}

function criarTransacaoMock(indice: number, classificacao: 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO') {
  return {
    id: `00000000-0000-4000-8000-${String(indice).padStart(12, '0')}`,
    dataTransacao: '2026-03-31T00:00:00.000Z',
    descricao: `Transação ${indice}`,
    valor: 123.45,
    tipo: indice % 2 === 0 ? 'ENTRADA' : 'SAIDA',
    classificacao,
    categoriaGenerica: classificacao === 'INDEFINIDO' ? null : 'Categoria Teste',
    hashTransacao: `hash-${indice}`,
    identificador: `Conta ${indice}`,
  };
}

async function mockTransacoes(page: Page, options: MockTransacoesOptions = {}) {
  const requests: string[] = [];
  const totalRegistrosBase = options.totalRegistros ?? 60;
  const totalIndefinidos = options.totalIndefinidos ?? 12;

  await page.route('**/api/transacoes**', async (route) => {
    const requestUrl = route.request().url();
    requests.push(requestUrl);

    const url = new URL(requestUrl);
    const pagina = Number(url.searchParams.get('pagina') ?? '1') || 1;
    const limite = Number(url.searchParams.get('limite') ?? '25') || 25;
    const classificacao = url.searchParams.get('classificacao');
    const totalRegistros = classificacao === 'INDEFINIDO' ? totalIndefinidos : totalRegistrosBase;
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

    if (pagina > totalPaginas) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          erro: `Página ${pagina} não existe. Total de páginas: ${totalPaginas}.`,
          codigo: 'INVALID_PAGE',
          detalhes: [
            {
              campo: 'pagina',
              mensagem: `Página solicitada (${pagina}) excede o total de páginas disponíveis (${totalPaginas}).`,
            },
          ],
        }),
      });
      return;
    }

    const inicio = (pagina - 1) * limite;
    const quantidade = Math.max(0, Math.min(limite, totalRegistros - inicio));
    const classificacaoLinha =
      classificacao === 'PESSOAL' || classificacao === 'EMPRESA' || classificacao === 'INDEFINIDO'
        ? classificacao
        : 'PESSOAL';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        dados: Array.from({ length: quantidade }, (_, offset) => criarTransacaoMock(inicio + offset + 1, classificacaoLinha)),
        paginacao: {
          paginaAtual: pagina,
          totalPaginas,
          totalRegistros,
          limite,
        },
        totais: {
          pessoal: 500,
          empresa: 300,
          total: 800,
          indefinidos: totalIndefinidos,
        },
      }),
    });
  });

  return requests;
}

async function mockRegras(page: Page) {
  await page.route('**/api/regras', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });
}

test.describe('SPA URL State Synchronization - E2E', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await abrirTelaUpload(page);
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Passo Upload ↔ Revisão (HomePage)', () => {
    test('inicia com passo=upload (sem URL params)', async () => {
      expect(page.url()).toBe(`${BASE_URL}/`);
      await expect(page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]')).toHaveCount(1);
    });

    test('navega para revisao após selecionar arquivo (+URL param)', async () => {
      const inputFile = page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]');
      const fixture = buildCsvFixture();

      await inputFile.setInputFiles(fixture);
      await page.getByRole('button', { name: /Revisar Arquivos/i }).click();

      await page.waitForURL(/\?passo=revisao/i, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /Revisar Arquivos/i })).toBeVisible();
    });

    test('volta para upload se clicar em "Voltar" na revisão', async () => {
      const inputFile = page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]');
      const fixture = buildCsvFixture();

      await inputFile.setInputFiles(fixture);
      await page.getByRole('button', { name: /Revisar Arquivos/i }).click();
      await page.waitForURL(/\?passo=revisao/i, { timeout: 10000 });

      await page.getByRole('button', { name: /^←\s*Voltar$/i }).click();

      await expect(page).toHaveURL(`${BASE_URL}/`);
      await expect(page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]')).toHaveCount(1);
    });

    test('fallback: reload com passo=revisao retorna a upload (sem File[])', async () => {
      await page.goto(`${BASE_URL}/?passo=revisao`, { waitUntil: 'networkidle' });

      await expect(page).toHaveURL(`${BASE_URL}/`);
      await expect(page.locator('input[type="file"][accept=".csv,.ofx,.xls,.xlsx"]')).toHaveCount(1);
    });
  });

  test.describe('Filtragem em ConciliacaoPage (URL params)', () => {
    test('URL vazia usa defaults: pagina=1, limite=25, filtro=todos', async () => {
      const requests = await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });

      expect(page.url()).toBe(`${BASE_URL}/conciliacao`);
      expect(requests.some((url) => url.includes('pagina=1') && url.includes('limite=25'))).toBeTruthy();
      await expect(page.getByText(/Página\s+1\s+de\s+3/i)).toBeVisible();
    });

    test('filtro "indefinidos" salva na URL', async () => {
      const requests = await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Ver Indefinidos/i }).click();

      await page.waitForURL(/filtro=indefinidos/i, { timeout: 5000 });
      expect(requests.some((url) => url.includes('classificacao=INDEFINIDO'))).toBeTruthy();
    });

    test('alteração de página sincroniza URL', async () => {
      await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Próxima/i }).click();

      await page.waitForURL(/pagina=2/, { timeout: 5000 });
      await expect(page.getByText(/Página\s+2\s+de\s+3/i)).toBeVisible();
    });

    test('reload preserva estado: ?pagina=3&filtro=indefinidos', async () => {
      const requests = await mockTransacoes(page, { totalRegistros: 80, totalIndefinidos: 80 });

      await page.goto(`${BASE_URL}/conciliacao?pagina=3&filtro=indefinidos`, { waitUntil: 'networkidle' });
      expect(page.url()).toContain('pagina=3');
      expect(page.url()).toContain('filtro=indefinidos');

      const reloadResponse = page.waitForResponse(
        (res) =>
          res.url().includes('/api/transacoes') &&
          res.request().url().includes('pagina=3') &&
          res.request().url().includes('classificacao=INDEFINIDO'),
        { timeout: 5000 }
      );

      await page.reload({ waitUntil: 'networkidle' });
      const resposta = await reloadResponse;

      expect(resposta.ok()).toBeTruthy();
      expect(requests.some((url) => url.includes('pagina=3') && url.includes('classificacao=INDEFINIDO'))).toBeTruthy();
      expect(page.url()).toContain('pagina=3');
      expect(page.url()).toContain('filtro=indefinidos');
    });

    test('busca sincroniza URL', async () => {
      await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });
      await page.getByPlaceholder(/Mín\. 3 caracteres/i).fill('cafe');

      await page.waitForURL(/busca=cafe/i, { timeout: 5000 });
      expect(page.url()).toContain('busca=cafe');
    });

    test('classificação não-default sincroniza URL', async () => {
      await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });
      await page.locator('select').first().selectOption('PESSOAL');

      await page.waitForURL(/classificacao=PESSOAL/i, { timeout: 5000 });
      expect(page.url()).toContain('classificacao=PESSOAL');
    });

    test('compartilhamento de URL: abrir URL com params em nova aba', async ({ browser }) => {
      await mockTransacoes(page, { totalRegistros: 120, totalIndefinidos: 120 });

      await page.goto(`${BASE_URL}/conciliacao?pagina=2&limite=50&filtro=indefinidos`, { waitUntil: 'networkidle' });
      const url = page.url();
      const storageState = await context.storageState();

      const secondContext = await browser.newContext({ storageState });
      const newPage = await secondContext.newPage();
      const requests = await mockTransacoes(newPage, { totalRegistros: 120, totalIndefinidos: 120 });

      await newPage.goto(url, { waitUntil: 'networkidle' });

      expect(newPage.url()).toBe(url);
      expect(requests.some((requestUrl) => requestUrl.includes('pagina=2') && requestUrl.includes('limite=50') && requestUrl.includes('classificacao=INDEFINIDO'))).toBeTruthy();

      await secondContext.close();
    });
  });

  test.describe('RegrasPage - Modal com URL', () => {
    test.beforeEach(async () => {
      await mockRegras(page);
      await page.goto(`${BASE_URL}/regras`, { waitUntil: 'networkidle' });
    });

    test('URL sem modalTeste tem modal fechado', async () => {
      await expect(page.getByTestId('modal-teste')).toHaveCount(0);
    });

    test('?modalTeste=1 abre modal', async () => {
      await page.goto(`${BASE_URL}/regras?modalTeste=1`, { waitUntil: 'networkidle' });

      await expect(page.getByTestId('modal-teste')).toBeVisible();
      await expect(page.getByRole('dialog', { name: /Teste de Regras/i })).toBeVisible();
    });

    test('clicar em "Abrir Teste" adiciona ?modalTeste=1 à URL', async () => {
      await page.getByRole('button', { name: /Abrir Teste de Regras/i }).click();

      await page.waitForURL(/modalTeste=1/i, { timeout: 5000 });
      await expect(page.getByTestId('modal-teste')).toBeVisible();
    });

    test('fechar modal remove ?modalTeste da URL', async () => {
      await page.goto(`${BASE_URL}/regras?modalTeste=1`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /^Fechar$/i }).click();

      await expect(page).toHaveURL(`${BASE_URL}/regras`);
      await expect(page.getByTestId('modal-teste')).toHaveCount(0);
    });
  });

  test.describe('Validação de página inválida (erro backend)', () => {
    test('página > totalPaginas retorna erro 400 INVALID_PAGE', async () => {
      await mockTransacoes(page, { totalRegistros: 10 });

      const errorResponse = page.waitForResponse(
        (res) => res.url().includes('/api/transacoes') && res.status() === 400,
        { timeout: 5000 }
      );

      await page.goto(`${BASE_URL}/conciliacao?pagina=999999`, { waitUntil: 'networkidle' });

      const response = await errorResponse;
      const json = await response.json();
      expect(json.codigo).toBe('INVALID_PAGE');
      expect(json.erro).toContain('Página 999999 não existe');
    });
  });

  test.describe('Navegação entre páginas (React Router SPA)', () => {
    test('não há reload ao navegar de Home → Conciliação → Regras', async () => {
      await mockTransacoes(page);
      await mockRegras(page);

      const loads: string[] = [];
      page.on('load', () => {
        loads.push(page.url());
      });

      await page.getByRole('link', { name: /Ir para Tabela/i }).click();
      await expect(page).toHaveURL(/\/conciliacao$/);

      await page.getByRole('link', { name: /Gerenciar Regras/i }).click();
      await expect(page).toHaveURL(/\/regras$/);

      expect(loads.length).toBe(0);
    });
  });

  test.describe('Tratamento de Erros - Simulação', () => {
    test('exibe estado de erro transitório se falhar ao carregar transações', async () => {
      await page.route('**/api/transacoes**', async (route) => {
        await route.abort('failed');
      });

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });

      await expect(page.getByText(/Aguardando sistema iniciar/i)).toBeVisible();
    });

    test('retentativa ao clicar em "Carregar dados existentes"', async () => {
      let callCount = 0;

      await page.route('**/api/transacoes**', async (route) => {
        callCount += 1;

        if (callCount === 1) {
          await route.abort('failed');
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            dados: [criarTransacaoMock(1, 'PESSOAL')],
            paginacao: {
              paginaAtual: 1,
              totalPaginas: 1,
              totalRegistros: 1,
              limite: 25,
            },
            totais: {
              pessoal: 123.45,
              empresa: 0,
              total: 123.45,
              indefinidos: 0,
            },
          }),
        });
      });

      await page.goto(`${BASE_URL}/conciliacao`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Carregar dados existentes/i }).click();

      await expect.poll(() => callCount, { timeout: 5000 }).toBeGreaterThanOrEqual(2);
      await expect(page.getByText(/Mostrando\s+1\s+a\s+1\s+de\s+1\s+transações\./i)).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('URL com caracteres especiais em busca', async () => {
      await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao?busca=caf%C3%A9%20com%20le%C3%ADte`, { waitUntil: 'networkidle' });

      const urlAtual = new URL(page.url());
      expect(urlAtual.searchParams.get('busca')).toBe('café com leíte');
      await expect(page.getByPlaceholder(/Mín\. 3 caracteres/i)).toHaveValue('café com leíte');
    });

    test('URL com múltiplos parâmetros malformados', async () => {
      await mockTransacoes(page);

      await page.goto(`${BASE_URL}/conciliacao?pagina=batata&limite=999999&tipo=INVALIDO`, { waitUntil: 'networkidle' });

      expect(page.url()).toContain('conciliacao');
      await expect(page.getByText(/Página\s+1\s+de\s+3/i)).toBeVisible();
    });

    test('voltar e avançar no navegador preserva estado', async () => {
      await mockTransacoes(page, { totalRegistros: 80, totalIndefinidos: 80 });

      await page.goto(`${BASE_URL}/conciliacao?pagina=2&filtro=indefinidos`, { waitUntil: 'networkidle' });
      const url1 = page.url();

      await mockRegras(page);
      await page.goto(`${BASE_URL}/regras`, { waitUntil: 'networkidle' });
      await page.goBack({ waitUntil: 'networkidle' });

      expect(page.url()).toBe(url1);
    });
  });
});
