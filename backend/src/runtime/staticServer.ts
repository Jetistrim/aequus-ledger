import express from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Monta o frontend compilado como SPA estática, servida pelo próprio backend.
 *
 * @remarks
 * Ativado automaticamente quando `dist/public/` existe junto do servidor
 * compilado (modo produção/empacotado). Em desenvolvimento, o Vite serve os
 * assets diretamente e esta função não é chamada.
 *
 * A ordem de montagem importa: os assets estáticos devem ser declarados
 * **antes** das rotas de API para que arquivos concretos (JS, CSS, imagens)
 * sejam servidos com prioridade. O fallback SPA (`*`) deve vir **depois** de
 * todas as rotas `/api/*`, para não interceptar chamadas de API quando o
 * recurso não for encontrado em disco.
 *
 * @param app - Aplicação Express onde os middlewares serão registrados.
 * @returns `true` se o diretório existir e a montagem ocorrer; `false` caso contrário.
 */
export function mountStaticAssets(app: ReturnType<typeof express>): boolean {
  const publicDir = path.resolve(__dirname, '..', 'public');

  if (!fs.existsSync(publicDir) || !fs.statSync(publicDir).isDirectory()) {
    return false;
  }

  app.use(
    express.static(publicDir, {
      dotfiles: 'deny',
      etag: true,
      index: false,
    }),
  );

  return true;
}

/**
 * Registra o fallback SPA: qualquer rota não resolvida por `/api/*` retorna
 * `index.html` para que o roteador do React assuma o controle no cliente.
 *
 * @param app - Aplicação Express onde o fallback será registrado.
 * @returns `true` se o `index.html` existir e o fallback for registrado.
 */
export function mountSpaFallback(app: ReturnType<typeof express>): boolean {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const indexFile = path.join(publicDir, 'index.html');

  if (!fs.existsSync(indexFile)) {
    return false;
  }

  // Express 5 / path-to-regexp v8 não suporta '*' literal sem nome.
  // Usar app.use (middleware) garante compatibilidade; o filtro abaixo restringe
  // o fallback apenas para navegação web (GET/HEAD + Accept HTML).
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const acceptHeader = req.get('accept') || '';
    if (!acceptHeader.includes('text/html')) {
      next();
      return;
    }

    res.sendFile(indexFile);
  });

  return true;
}
