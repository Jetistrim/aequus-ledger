# Changelog

## 2.1.3 - 2026-03-30

### Added

- autenticação por sessão com cookie `HttpOnly` no backend (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`)
- middleware de proteção para rotas sensíveis da API (`/api/upload`, `/api/transacoes`, `/api/regras`, `/api/export`)
- tela de login no frontend com validação de sessão ao carregar a aplicação (`AuthGate`)
- ação de logout nas telas principais para encerramento explícito da sessão

### Changed

- cliente HTTP do frontend passa a enviar credenciais (`withCredentials`) para suportar sessão
- CORS do backend passa a permitir credenciais para o fluxo autenticado
- documentação atualizada com variáveis de ambiente de autenticação (`AUTH_*`)

### Security

- bloqueio de acesso direto por aba aberta no navegador sem autenticação prévia

## 2.1.2 - 2026-03-30

### Added

- suporte a alimentação de regras via arquivos `seed-*.json` na pasta `config/`
- carregamento automático de múltiplos arquivos de seed por padrão de nome (sem lista hardcoded)
- testes unitários do loader de seed JSON (`backend/tests/seed-loader.test.ts`)
- inclusão da pasta `config/` no empacotamento `portable/` e `release/`

### Changed

- seed do backend centralizado em `backend/src/seed.ts` com wrapper fino em `backend/prisma/seed.ts`
- persistência idempotente de regras com `upsert` e manutenção do registro existente em conflito
- documentação atualizada para fluxo de regras por JSON e localização no pacote descompactado

### Fixed

- erro `spawn EINVAL` no launcher do frontend em Windows durante `npm run dev`
- ruído de CSP para `/favicon.ico` com resposta explícita `204` no backend
- remoção de termos hardcoded específicos de nicho/cliente no motor heurístico

## 2.0.0 - 2026-03-28

### Breaking Changes

- o backend passa a operar com runtime SQLite dedicado e caminhos de dados resolvidos por ambiente (`local`, `docker`, `packaged`)
- o fluxo legado baseado em PostgreSQL e adapter `@prisma/adapter-pg` foi removido do backend
- as migrações Prisma foram consolidadas para um baseline SQLite único
- o modo de desenvolvimento local deixa de usar `backend/prisma/dev.db` e passa a usar `backend/.runtime/data/conciliacao.sqlite`

### Added

- empacotamento em executável único com `caxa`
- entrypoint empacotado com `prisma migrate deploy`, seed idempotente e bootstrap instrumentado
- descoberta da instância ativa por `active-instance.json` e lock de instância única
- fallback automático de porta com publicação da URL efetiva da aplicação
- abertura automática do navegador e bandeja do sistema no runtime empacotado
- serving do frontend compilado pelo próprio backend com fallback SPA controlado
- novos scripts de release: `build:release`, `package:caxa` e `release`
- testes para runtime paths, metadata de instância e static server
- documentação operacional em `docs/PACKAGING.md` e `docs/RUNTIME_BACKEND.md`

### Changed

- Docker Compose passa a usar persistência SQLite para o backend em vez de banco PostgreSQL separado
- healthchecks e fluxo `npm run dev` agora descobrem a URL real do backend a partir dos metadados de runtime
- `exportService` e `exportController` passam a usar diretórios resolvidos pelo runtime
- `browserLauncher` foi endurecido para abrir URLs com argumentos separados por plataforma
- metadados de instância agora incluem `host` e `appVersion`

### Fixed

- correção do seed compilado para `dist/seed.js`
- correção do fallback SPA para compatibilidade com Express 5, restrito a navegação `GET/HEAD` com `Accept: text/html`
- tratamento de desligamento com limpeza de lock e metadata da instância