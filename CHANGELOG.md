# Changelog

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