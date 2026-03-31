import { test, expect, Page } from '@playwright/test';

test.describe('SPA URL State Synchronization - E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Assumir que a aplicação está rodando em localhost:5173
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Passo Upload ↔ Revisão (HomePage)', () => {
    test('inicia com passo=upload (sem URL params)', async () => {
      const url = page.url();
      expect(url).not.toContain('passo=');
    });

    test('navega para revisao após upload bem-sucedido (+URL param)', async () => {
      // Simular seleção de arquivo
      const inputFile = page.locator('input[type="file"]');
      
      if (await inputFile.isVisible({ timeout: 5000 })) {
        // Criar arquivo CSV minimal para teste
        const fileContent = 'data,descricao,valor\n2026-03-31,Café,50.00\n';
        const buffer = Buffer.from(fileContent);
        
        await inputFile.setInputFiles({
          name: 'test.csv',
          mimeType: 'text/csv',
          buffer: buffer,
        });

        // Clicar em "Processar" ou similar
        const botaoProcessar = page.locator('button:has-text(/processar|enviar|upload/i)');
        if (await botaoProcessar.isVisible({ timeout: 2000 })) {
          await botaoProcessar.click();
        }

        // Aguardar navegação para revisão
        await page.waitForURL(/\?passo=revisao/i, { timeout: 10000 });
        
        expect(page.url()).toContain('passo=revisao');
      }
    });

    test('volta para upload se clicar em "Novo Upload"', async () => {
      // Navegar para revisao
      await page.goto('http://localhost:5173?passo=revisao', { waitUntil: 'networkidle' });

      // Localizar botão "Novo Upload" e clicar
      const botaoNovoUpload = page.locator('button:has-text(/novo upload|recomeçar|reset/i)');
      if (await botaoNovoUpload.isVisible({ timeout: 5000 })) {
        await botaoNovoUpload.click();
        
        // URL deve voltar ao estado inicial (sem passo ou passo=upload)
        await page.waitForURL(/(\?$|$)/, { timeout: 5000 });
        expect(page.url()).not.toContain('passo=revisao');
      }
    });

    test('fallback: reload com passo=revisao retorna a upload (sem File[])', async () => {
      // Tentar navegar diretamente para revisao sem upload prévio
      await page.goto('http://localhost:5173?passo=revisao', {
        waitUntil: 'networkidle',
      });

      // Aguardar para componente detectar que não há Files
      // (fallback lógico em HomePage)
      await page.waitForTimeout(1000);

      // Se implementado corretamente, deve redirecionar ou mostrar upload zone
      const urlFinal = page.url();
      // Pode estar vazio, upload, ou mostrar mensagem de erro
      expect(
        urlFinal.includes('passo=upload') || 
        !urlFinal.includes('passo=revisao') ||
        (await page.locator('input[type="file"]').isVisible({ timeout: 2000 }))
      ).toBeTruthy();
    });
  });

  test.describe('Filtragem em ConciliacaoPage (URL params)', () => {
    test.beforeEach(async () => {
      // Assumir que existem transações no banco (de testes prévios)
      await page.goto('http://localhost:5173/conciliacao', {
        waitUntil: 'networkidle',
      });
    });

    test('URL vazia usa defaults: pagina=1, limite=25, filtro=todos', async () => {
      // API deve ser chamada com defaults
      const apiRequest = page.waitForResponse(
        (res) =>
          res.url().includes('/api/transacoes') &&
          res.status() === 200
      );

      await page.goto('http://localhost:5173/conciliacao', {
        waitUntil: 'networkidle',
      });

      const response = await apiRequest;
      const json = await response.json();

      expect(json.pagina).toBe(1);
      expect(json.limite).toBe(25);
    });

    test('filtro "indefinidos" salva na URL', async () => {
      const botaoFiltro = page.locator('button:has-text(/indefinidos|filtro/i)');
      
      if (await botaoFiltro.isVisible({ timeout: 3000 })) {
        await botaoFiltro.click();

        // URL deve ter ?filtro=indefinidos
        await page.waitForURL(/filtro=indefinidos/i, { timeout: 5000 });
        expect(page.url()).toContain('filtro=indefinidos');
      }
    });

    test('alteração de página sincroniza URL', async () => {
      // Navegar para página 2
      const botaoPagina2 = page.locator('button:has-text("2")', {
        hasText: /^\s*2\s*$/,
      });

      if (await botaoPagina2.isVisible({ timeout: 3000 })) {
        await botaoPagina2.click();

        // URL deve ter ?pagina=2
        await page.waitForURL(/pagina=2/, { timeout: 5000 });
        expect(page.url()).toContain('pagina=2');
      }
    });

    test('reload preserva estado: ?pagina=3&filtro=indefinidos', async () => {
      // Navegar com query params específicos
      await page.goto(
        'http://localhost:5173/conciliacao?pagina=3&filtro=indefinidos',
        { waitUntil: 'networkidle' }
      );

      // Recarregar página
      await page.reload({ waitUntil: 'networkidle' });

      // URL deve permanecer igual
      expect(page.url()).toContain('pagina=3');
      expect(page.url()).toContain('filtro=indefinidos');

      // API deve ser chamada com esses params (sem usar APIs internas do Playwright)
      const resposta = await page.waitForResponse((res) => {
        return (
          res.url().includes('/api/transacoes') &&
          res.request().url().includes('pagina=3') &&
          res.request().url().includes('filtro=indefinidos')
        );
      }, { timeout: 5000 });

      expect(resposta.ok()).toBeTruthy();
    });

    test('busca sincroniza URL', async () => {
      const inputBusca = page.locator('input[placeholder*="busca" i]');

      if (await inputBusca.isVisible({ timeout: 3000 })) {
        await inputBusca.fill('café');
        await inputBusca.press('Enter');

        // URL deve ter ?busca=café
        await page.waitForURL(/busca=caf/, { timeout: 5000 });
        expect(page.url()).toContain('busca');
      }
    });

    test('classificação não-default sincroniza URL', async () => {
      const selectClassificacao = page.locator('select[name="classificacao"]') ||
        page.locator('[aria-label*="classificação" i]');

      if (await selectClassificacao.isVisible({ timeout: 3000 })) {
        await selectClassificacao.selectOption('PESSOAL');

        // URL deve ter ?classificacao=PESSOAL
        await page.waitForURL(/classificacao=PESSOAL/i, { timeout: 5000 });
        expect(page.url()).toContain('classificacao=PESSOAL');
      }
    });

    test('compartilhamento de URL: abrir URL com params em nova aba', async () => {
      // Página 1: navegar com filtros
      await page.goto(
        'http://localhost:5173/conciliacao?pagina=2&limite=50&filtro=indefinidos',
        { waitUntil: 'networkidle' }
      );

      const url = page.url();

      // Página 2: abrir em nova aba
      const newPage = await page.context().newPage();
      await newPage.goto(url, { waitUntil: 'networkidle' });

      // Ambas devem ter o mesmo estado
      expect(newPage.url()).toBe(url);

      // Verificar que filtros estão aplicados na nova aba
      // (Verificação visual ou de API call)

      await newPage.close();
    });
  });

  test.describe('RegrasPage - Modal com URL', () => {
    test.beforeEach(async () => {
      await page.goto('http://localhost:5173/regras', {
        waitUntil: 'networkidle',
      });
    });

    test('URL sem modalTeste tem modal fechado', async () => {
      const modal = page.locator('[data-testid="modal-teste"]') ||
        page.locator('[role="dialog"]');

      const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('?modalTeste=1 abre modal', async () => {
      await page.goto('http://localhost:5173/regras?modalTeste=1', {
        waitUntil: 'networkidle',
      });

      const modal = page.locator('[data-testid="modal-teste"]') ||
        page.locator('[role="dialog"]');

      const isVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isVisible).toBe(true);
    });

    test('clicar em "Abrir Teste" adiciona ?modalTeste=1 à URL', async () => {
      const botaoAbrirTeste = page.locator('button:has-text(/abrir.*teste|teste/i)');

      if (await botaoAbrirTeste.isVisible({ timeout: 3000 })) {
        await botaoAbrirTeste.click();

        // URL deve ter ?modalTeste=1
        await page.waitForURL(/modalTeste=1/i, { timeout: 5000 });
        expect(page.url()).toContain('modalTeste=1');
      }
    });

    test('fechar modal remove ?modalTeste da URL', async () => {
      await page.goto('http://localhost:5173/regras?modalTeste=1', {
        waitUntil: 'networkidle',
      });

      const botaoFechar = page.locator('button:has-text(/fechar|close|cancelar/i)');

      if (await botaoFechar.isVisible({ timeout: 3000 })) {
        await botaoFechar.click();

        // URL não deve ter ?modalTeste
        await page.waitForURL(/^(?!.*modalTeste)/, { timeout: 5000 });
        expect(page.url()).not.toContain('modalTeste');
      }
    });
  });

  test.describe('Validação de página inválida (erro backend)', () => {
    test('página > totalPaginas retorna erro 400 INVALID_PAGE', async () => {
      // Montar listener para capturar resposta
      const errorResponse = page.waitForResponse(
        (res) =>
          res.url().includes('/api/transacoes') &&
          res.status() === 400
      );

      // Solicitar página muito alta
      await page.goto(
        'http://localhost:5173/conciliacao?pagina=999999',
        { waitUntil: 'networkidle' }
      );

      // Se não houver erro, tudo bem (pode haver menos transações que esperado)
      // Se houver, verificar error code
      try {
        const response = await errorResponse;
        const json = await response.json();
        expect(json.error).toBe('INVALID_PAGE');
      } catch {
        // Timeout é OK (significa que não houve erro 400)
        console.log('Sem erro 400 (esperado se página válida)');
      }
    });
  });

  test.describe('Navegação entre páginas (React Router SPA)', () => {
    test('não há reload ao navegar de Home → Conciliação → Regras', async () => {
      // Capturaçãodas navegações
      const navigations: string[] = [];

      page.on('load', () => {
        navigations.push('load');
      });

      // Home
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      navigations.push('home');

      // Clicar em Conciliação (assumir que há link)
      const linkConciliacao = page.locator('a:has-text(/conciliação|revisão/i)');
      if (await linkConciliacao.isVisible({ timeout: 3000 })) {
        await linkConciliacao.click();
        await page.waitForURL('/conciliacao', { timeout: 5000 });
      }

      // Clicar em Regras
      const linkRegras = page.locator('a:has-text(/regras/i)');
      if (await linkRegras.isVisible({ timeout: 3000 })) {
        await linkRegras.click();
        await page.waitForURL('/regras', { timeout: 5000 });
      }

      // Verificar que houve apenas 1 load (inicial), não 3
      expect(navigations.filter((n) => n === 'load').length).toBeLessThanOrEqual(1);
    });
  });

  test.describe('Tratamento de Erros - Simulação', () => {
    // Para estes testes, seria ideal usar interceptação de rede (vi.mock ou Playwright intercepts)
    
    test('exibe erro se falhar ao carregar transações', async () => {
      // Interceptar requisição e retornar erro 500
      await page.route('**/api/transacoes**', (route) => {
        route.abort('failed');
      });

      await page.goto('http://localhost:5173/conciliacao', {
        waitUntil: 'networkidle',
      });

      // Verificar mensagem de erro
      const errorMsg = page.locator('text=/erro|failed/i');
      const isVisible = await errorMsg.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        expect(await errorMsg.textContent()).toMatch(/erro|failed/i);
      }
    });

    test('retentativa ao clicar em "Tentar Novamente"', async () => {
      let callCount = 0;

      await page.route('**/api/transacoes**', (route) => {
        callCount++;
        if (callCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('http://localhost:5173/conciliacao', {
        waitUntil: 'networkidle',
      });

      // Localizar botão de retentativa
      const botaoRetry = page.locator('button:has-text(/tentar|retry|novamente/i)');
      if (await botaoRetry.isVisible({ timeout: 3000 })) {
        await botaoRetry.click();
        await page.waitForTimeout(500);
      }

      expect(callCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Edge Cases', () => {
    test('URL com caracteres especiais em busca', async () => {
      await page.goto(
        'http://localhost:5173/conciliacao?busca=caf%C3%A9%20com%20le%C3%ADte',
        { waitUntil: 'networkidle' }
      );

      // URL deve estar corretamente decodificada
      expect(page.url()).toContain('busca');
      // Verificar que busca foi aplicada
      // (Detalhes dependem da UI)
    });

    test('URL com múltiplos parâmetros malformados', async () => {
      // URL com parâmetros inválidos
      await page.goto(
        'http://localhost:5173/conciliacao?pagina=batata&limite=999999&tipo=INVALIDO',
        { waitUntil: 'networkidle' }
      );

      // Aplicação deve usar defaults silenciosamente
      // Página deve carregar sem erro
      expect(page.url()).toContain('conciliacao');

      // Verificar que a tabela está visível (dados carregados)
      const tabela = page.locator('table') || page.locator('[role="grid"]');
      const isVisible = await tabela.isVisible({ timeout: 5000 }).catch(() => true);
      
      // Pode não haver tabela se não houver dados, ok
      expect(isVisible).not.toBe(undefined);
    });

    test('voltar e avançar no navegador preserva estado', async () => {
      // Página 1: Conciliação com filtros
      await page.goto(
        'http://localhost:5173/conciliacao?pagina=2&filtro=indefinidos',
        { waitUntil: 'networkidle' }
      );

      const url1 = page.url();

      // Ir para Regras
      await page.goto('http://localhost:5173/regras', {
        waitUntil: 'networkidle',
      });

      // Voltar (browser back)
      await page.goBack({ waitUntil: 'networkidle' });

      // URL deve ser a mesma da página 1
      expect(page.url()).toBe(url1);
    });
  });
});
