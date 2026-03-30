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

Sobe backend Express + frontend Vite com hot-reload.

### Perfil de produção (Nginx)

```bash
npm run docker:up:prod
```

Sobe backend Express + frontend estático servido por Nginx.

No profile de produção:
- o backend não é exposto diretamente na máquina host
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

## Regras Via JSON (seed-*.json)

As regras de classificação são carregadas automaticamente a partir de arquivos `seed-*.json` no diretório `config/`.

- Local no repositório: `config/`
- Local após descompactar o pacote portátil: `config/` na raiz da pasta descompactada
- Exemplo de arquivos: `seed-generico.json`, `seed-estetica.json`, `seed-alexia.json`

Formato esperado:

```json
{
	"perfil": "generico",
	"descricao": "Regras de exemplo",
	"regras": [
		{
			"palavraChave": "IFOOD,RAPPI",
			"categoria": "PESSOAL",
			"subCategoria": "Alimentacao",
			"prioridade": 1
		}
	]
}
```

Regras de carga:

- O backend procura automaticamente qualquer arquivo com padrão `seed-*.json`.
- O carregamento é idempotente por `upsert` no Prisma (chave composta de regra).
- Em conflito, o registro existente no banco é mantido e não é duplicado.
- Se quiser apontar para outra pasta, use `SEED_CONFIG_DIR`.

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

**Healthchecks nativos no Docker Compose** — monitoram `backend`, `frontend-dev` e `frontend-prod` antes de inicializar serviços dependentes.

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

Observação: no modo local de desenvolvimento (`npm run dev`), o backend armazena os dados em `backend/.runtime/data/conciliacao.sqlite`.

Se a porta preferida do backend (`3001`) estiver ocupada, o runtime local faz fallback automático para uma porta livre e o launcher do frontend descobre essa URL efetiva antes de subir o Vite.

### Backend

```bash
cd backend
npm install
npm run dev          # executa seed e sobe servidor
```

Observação: o banco local de desenvolvimento é persistente em `backend/.runtime/data/conciliacao.sqlite`.
Para reset completo do histórico local, remova esse arquivo antes de subir novamente.

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
DATABASE_URL="file:./.runtime/data/conciliacao.sqlite"
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE_MB=10
MAX_TOTAL_UPLOAD_SIZE_MB=100
AUTH_ENABLED=true
AUTH_USERNAME=admin
AUTH_PASSWORD=troque-esta-senha
AUTH_SESSION_HOURS=8
```

### Autenticação de acesso

- O frontend exige login antes de exibir upload, conciliação e regras.
- A API protege as rotas sensíveis com sessão via cookie `HttpOnly`.
- Endpoints públicos: `/api/health` e `/api/auth/*`.

Endpoints de autenticação:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Se `AUTH_ENABLED=false`, o backend libera o acesso sem login (útil para testes locais controlados).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express 5 + TypeScript |
| Banco | SQLite + Prisma 7 + `@prisma/adapter-better-sqlite3` |
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
