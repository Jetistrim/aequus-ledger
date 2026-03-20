# Conciliação Financeira

Sistema web de conciliação financeira pessoal/empresarial. Faz upload de extratos bancários, classifica cada transação automaticamente como **Pessoal** ou **Empresa** com base em regras configuráveis e, ao final, gera dois CSVs separados prontos para importação no Excel ou envio ao contador.

## Pré-requisito único

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Início Rápido

### Perfil de desenvolvimento (Vite HMR)

```bash
npm run docker:up
```

Sobe PostgreSQL + backend Express + frontend Vite com hot-reload.

### Perfil de produção (Nginx)

```bash
npm run docker:up:prod
```

Sobe PostgreSQL + backend Express + frontend estático servido por Nginx.

No profile de produção:
- o backend não é exposto diretamente na máquina host
- o banco não é exposto diretamente na máquina host
- o frontend publica apenas a porta `5173` e faz proxy interno para a API

Acesse em produção local: **https://localhost:5173**

> O profile `prod` usa HTTPS no Nginx. Se não houver certificado em `frontend/certs/tls.crt` e `frontend/certs/tls.key`, um certificado self-signed para `localhost` é gerado automaticamente no startup.

Acesse em desenvolvimento: **http://localhost:5173**

> O container do backend executa automaticamente `prisma migrate deploy` e `npm run seed` na inicialização — nenhuma configuração manual de banco é necessária.

---

## Fluxo de Uso

1. **Upload** — arraste arquivos de extrato ou selecione uma pasta para localizar automaticamente arquivos `.csv`, `.ofx`, `.xls` e `.xlsx`
2. **Conciliação** — revise as transações classificadas automaticamente e ajuste as que ficaram *Indefinidas*
3. **Exportação** — clique em "Gerar Extratos" para baixar `extrato_pessoal_DD-MM-YYYY.csv` e `extrato_empresa_DD-MM-YYYY.csv`

---

## Comandos Docker

```bash
# Subir perfil dev (com Vite HMR)
npm run docker:up

# Subir perfil prod (Nginx)
npm run docker:up:prod

# Ver logs em tempo real
npm run docker:logs

# Verificar se backend e frontend estão respondendo
npm run docker:healthcheck

# Parar containers
npm run docker:down

# Parar e remover volumes (reset completo do banco)
npm run docker:down:volumes
```

---

## Healthcheck

O projeto tem duas camadas de verificação de saúde:

**Healthchecks nativos no Docker Compose** — monitoram `db`, `backend`, `frontend-dev` e `frontend-prod` antes de inicializar serviços dependentes.

**Script manual** — `npm run docker:healthcheck` — verifica rapidamente se a aplicação está pronta:

- `http://localhost:3001/api/health`
- `http://localhost:5173`

No profile `prod`, o script usa `https://localhost:5173` (com fallback para certificado self-signed local).

Variáveis de ambiente opcionais para o script:

```env
HEALTHCHECK_BACKEND_URL=http://localhost:3001/api/health
HEALTHCHECK_FRONTEND_URL=http://localhost:5173
HEALTHCHECK_TIMEOUT_MS=90000
HEALTHCHECK_INTERVAL_MS=3000
```

---

## Endurecimento de Runtime

As imagens e containers foram ajustados para reduzir a superfície de ataque:

- backend em multi-stage com código TypeScript compilado no runtime final
- seed compilado, sem `ts-node` no container de produção
- `helmet` ativo no backend e remoção do header `X-Powered-By`
- frontend de produção servido por Nginx com headers de segurança
- HTTPS habilitado no Nginx de produção
- containers com `no-new-privileges` e `cap_drop: ALL`
- frontend de produção com filesystem somente leitura
- backend e banco sem exposição pública no profile de produção

---

## Segurança e Scan

Triagem técnica atual de segurança:

- veja `docs/security-triage.md`

Scan local com Trivy:

```bash
npm run security:scan
```

Scan automatizado no GitHub Actions:

- `.github/workflows/security-scan.yml`
- executa em `push`, `pull_request` e agenda semanal
- bloqueia `HIGH/CRITICAL` em filesystem e imagens de produção

---

## Execução local sem Docker

Necessário: Node.js 20+.

Observação: no modo local de desenvolvimento (`npm run dev`), o backend usa SQLite volátil (`backend/prisma/dev.db`) e reseta os dados a cada inicialização.

### Backend

```bash
cd backend
npm install
npm run dev          # reseta SQLite, executa seed e sobe servidor
```

Para usar PostgreSQL local manualmente no backend, crie `backend/.env` com `DATABASE_URL` e rode:

```bash
cd backend
npm run dev:postgres
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server em http://localhost:5173
```

### Ambos simultaneamente (via raiz)

```bash
npm run dev
```

---

## Variáveis de Ambiente

### `backend/.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/conciliacao_financeira"
PORT=3001
CORS_ORIGIN=http://localhost:5173
EXPORTS_DIR=./exports
MAX_FILE_SIZE_MB=10
MAX_TOTAL_UPLOAD_SIZE_MB=100
```

### `.env` (raiz, opcional — sobrescreve defaults do Docker Compose)

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=conciliacao_financeira
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express 5 + TypeScript |
| Banco | PostgreSQL 16 + Prisma 7 + `@prisma/adapter-pg` |
| Frontend | React 19 + TypeScript + Vite 6 |
| Estilização | Tailwind CSS 3 |
| Upload | Multer 2 (memoryStorage) |
| Parsing | csv-parser, ofx-js, xlsx, iconv-lite |
| Exportação | json2csv |
| Containers | Docker Compose (perfis dev/prod) |

---

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para o texto completo.

As versões já publicadas com licença MIT continuam MIT. Versões futuras deste projeto podem ser publicadas sob outra licença, a critério do mantenedor.
