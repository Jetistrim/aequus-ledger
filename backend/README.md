# Backend — Conciliação Financeira

API REST em Node.js + Express 5 + TypeScript responsável por receber extratos bancários, classificar transações e gerar os CSVs de exportação.

---

## Pré-requisitos

- Node.js 20+
- PostgreSQL 16+ (ou rodar via Docker Compose na raiz)

---

## Configuração

Crie o arquivo `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/conciliacao_financeira"
PORT=3001
CORS_ORIGIN=http://localhost:5173
EXPORTS_DIR=./exports
MAX_FILE_SIZE_MB=10
MAX_TOTAL_UPLOAD_SIZE_MB=100
```

---

## Scripts

```bash
npm run dev          # servidor em modo watch (nodemon + ts-node)
npm run build        # compila TypeScript para dist/
npm run start        # executa dist/index.js (produção)
npm run db:migrate   # aplica migrações pendentes (prisma migrate deploy)
npm run seed         # popula regras de classificação iniciais
```

O script `start:docker` é usado exclusivamente pelo container Docker — ele roda migrate + seed + servidor em sequência.

---

## Estrutura

```
backend/
├── prisma.config.ts          # Prisma 7: datasource via DATABASE_URL
├── prisma/
│   ├── schema.prisma         # Modelos: Transacao, Regra + enums
│   ├── seed.ts               # Regras iniciais com subcategorias
│   └── migrations/
├── src/
│   ├── index.ts              # Entry point: CORS, rotas, health check
│   ├── lib/
│   │   └── prisma.ts         # Singleton PrismaClient (adapter pg)
│   ├── controllers/
│   │   ├── uploadController.ts       # POST /api/upload
│   │   ├── transacoesController.ts   # GET/PATCH/DELETE /api/transacoes
│   │   ├── regrasController.ts       # CRUD /api/regras
│   │   └── exportController.ts       # POST /api/export
│   ├── services/
│   │   ├── parserService.ts          # Fachada: delega para o parser correto
│   │   ├── parser/
│   │   │   ├── types.ts              # TransacaoRaw, ColunasTransacao
│   │   │   ├── common.ts             # parseDataGenerica, extrairValorLinha
│   │   │   ├── csvParser.ts          # csv-parser + iconv-lite
│   │   │   ├── ofxParser.ts          # ofx-js
│   │   │   └── spreadsheetParser.ts  # xlsx
│   │   ├── classificadorService.ts   # Motor de regras
│   │   ├── hashService.ts            # SHA-256 para deduplicação
│   │   └── exportService.ts          # json2csv, BOM UTF-8
│   ├── middlewares/
│   │   ├── uploadMiddleware.ts       # Multer: extensão + MIME, 50 arquivos/10MB
│   │   └── errorHandler.ts           # Handler global de erros
│   ├── routes/
│   │   ├── uploadRoutes.ts
│   │   ├── transacoesRoutes.ts
│   │   ├── regrasRoutes.ts
│   │   └── exportRoutes.ts
│   ├── utils/
│   │   ├── normalization.ts          # sanitizeTextInput, normalizeForMatching, protectCsvFormula
│   │   └── dateUtils.ts
│   └── types/
│       └── ofx.d.ts
├── exports/                  # CSVs gerados (mountado como volume Docker)
└── uploads/                  # Arquivos temporários (memoryStorage, nunca persiste)
```

---

## API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/upload` | Recebe até 50 arquivos no campo `arquivos`, com limite total combinado de 100MB |
| `GET` | `/api/transacoes` | Lista todas as transações |
| `PATCH` | `/api/transacoes/:id` | Atualiza classificação e/ou observação |
| `DELETE` | `/api/transacoes` | Remove todas as transações |
| `GET` | `/api/regras` | Lista todas as regras |
| `POST` | `/api/regras` | Cria nova regra |
| `PUT` | `/api/regras/:id` | Atualiza regra |
| `DELETE` | `/api/regras/:id` | Remove regra |
| `POST` | `/api/export` | Gera e retorna os dois CSVs |
| `GET` | `/api/health` | Health check |

### Resposta de upload

```json
{
  "importadas": 87,
  "duplicadas": 3,
  "indefinidas": 12,
  "transacoes": [...]
}
```

---

## Banco de Dados

### Prisma 7

O Prisma 7 separa a configuração da conexão do schema. A URL de conexão é definida exclusivamente em `prisma.config.ts` — **o `schema.prisma` não inclui `datasource { url }`**.

O `PrismaClient` usa `@prisma/adapter-pg` como driver:

```typescript
// src/lib/prisma.ts
const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
export const prisma = new PrismaClient({ adapter });
```

### Modelos principais

**`Transacao`** — campos relevantes:
- `hashTransacao` (unique) — garante idempotência no upload
- `classificacao` — `PESSOAL | EMPRESA | INDEFINIDO`
- `categoriaGenerica` — subcategoria da regra que fez match
- `arquivoOrigem` — nome do arquivo de origem

**`Regra`** — campos:
- `palavraChave` — lista separada por vírgula (ex: `IFOOD,RAPPI,UBER EATS`)
- `categoria` — `PESSOAL | EMPRESA`
- `subCategoria` — ex: `Alimentação`, `Imposto`
- `prioridade` — menor número = maior prioridade

---

## Formatos de arquivo suportados

| Formato | Parser | Observações |
|---|---|---|
| `.csv` | csv-parser | Detecta separador `,` ou `;`; suporta UTF-8 e ISO-8859-1 |
| `.ofx` | ofx-js | Extrai `DTPOSTED`, `TRNAMT`, `MEMO`/`NAME` |
| `.xls` / `.xlsx` | xlsx | Detecta colunas automaticamente |

---

## Motor de Classificação

```
Descrição bruta
    ↓ sanitizeTextInput       (remove chars de controle, normaliza unicode)
    ↓ normalizeForMatching    (remove acentos, uppercase, remove stopwords bancárias)
    ↓ comparação por includes contra palavras-chave das regras (ordem de prioridade)
    ↓ resultado: { classificacao, categoriaGenerica }
```

Stopwords removidas antes da comparação: `PIX`, `TED`, `DOC`, `PAGAMENTO`, `COMPRA`, `DEBITO`, `CREDITO`, `TRANSFERENCIA`, e outras — para que a classificação seja pelo estabelecimento, não pela operação.

---

## Exportação

Dois arquivos gerados em `exports/`:
- `extrato_pessoal_DD-MM-YYYY.csv`
- `extrato_empresa_DD-MM-YYYY.csv`

Colunas: `data_transacao; descricao; valor; tipo; classificacao; categoria_generica; observacao`

- Separador `;` (compatibilidade Excel Brasil)
- Encoding UTF-8 com BOM (`\uFEFF`)
- Valores monetários com vírgula decimal (`1234,56`)
- `protectCsvFormula` aplicado em campos de texto (anti-CSV injection)
