# Conciliação Financeira — Copilot Instructions

## Visão Geral do Projeto

Sistema web de conciliação financeira pessoal/empresarial. O usuário faz upload de extratos bancários (CSV, OFX, XLS ou XLSX), o sistema classifica automaticamente cada transação como **Pessoal** ou **Empresa** com base em regras configuráveis, o usuário revisa e corrige os itens indefinidos, e ao final gera dois arquivos CSV separados prontos para o contador ou importação no Excel.

**Stack:**
- **Backend:** Node.js (Express 5) + TypeScript
- **Banco de dados:** PostgreSQL 16 (via Prisma 7 ORM + `@prisma/adapter-pg`)
- **Frontend:** React 19 + TypeScript + Vite 6
- **Estilização:** Tailwind CSS 3
- **Upload de arquivos:** Multer 2 (memoryStorage, múltiplos arquivos)
- **Parsing:** csv-parser (CSV), ofx-js (OFX), xlsx (XLS/XLSX), iconv-lite (encoding)
- **Geração de CSV:** json2csv (servidor)
- **Containerização:** Docker Compose com perfis `dev` e `prod`

---

## Estrutura de Pastas

```
conciliacao-financeira/
├── package.json                           # Scripts raiz: dev, docker:up, docker:down, etc.
├── docker-compose.yml                     # Perfis: dev (Vite HMR) e prod (Nginx)
├── scripts/
│   └── healthcheck.mjs                    # Verifica se backend e frontend estão online
│
├── backend/
│   ├── prisma.config.ts                   # Prisma 7: configura datasource via DATABASE_URL
│   ├── prisma/
│   │   ├── schema.prisma                  # Modelos: Transacao, Regra + enums
│   │   ├── seed.ts                        # Popula regras iniciais com subcategorias
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts                       # Entry point Express (CORS, rotas, health)
│   │   ├── lib/
│   │   │   └── prisma.ts                  # Singleton PrismaClient com adapter pg
│   │   ├── controllers/
│   │   │   ├── uploadController.ts        # Recebe arquivos, processa em lotes, salva
│   │   │   ├── transacoesController.ts    # CRUD de transações
│   │   │   ├── regrasController.ts        # CRUD de regras de classificação
│   │   │   └── exportController.ts        # Gera CSVs e envia para download
│   │   ├── services/
│   │   │   ├── parserService.ts           # Fachada: delega para o parser correto
│   │   │   ├── parser/
│   │   │   │   ├── types.ts               # TransacaoRaw, ColunasTransacao
│   │   │   │   ├── common.ts              # Funções compartilhadas (datas, valores, colunas)
│   │   │   │   ├── csvParser.ts           # Parser CSV (csv-parser + iconv-lite)
│   │   │   │   ├── ofxParser.ts           # Parser OFX (ofx-js)
│   │   │   │   └── spreadsheetParser.ts   # Parser XLS/XLSX (xlsx)
│   │   │   ├── classificadorService.ts    # Motor de regras → Classificacao + categoriaGenerica
│   │   │   ├── hashService.ts             # SHA-256: data|valor|descricao
│   │   │   └── exportService.ts           # json2csv, separador ;, BOM UTF-8, anti-injection
│   │   ├── middlewares/
│   │   │   ├── uploadMiddleware.ts        # Multer: extensão + MIME, até 50 arquivos/10MB
│   │   │   └── errorHandler.ts            # Tratamento global de erros
│   │   ├── routes/
│   │   │   ├── uploadRoutes.ts
│   │   │   ├── transacoesRoutes.ts
│   │   │   ├── regrasRoutes.ts
│   │   │   └── exportRoutes.ts
│   │   ├── utils/
│   │   │   ├── normalization.ts           # sanitizeTextInput, normalizeForMatching, protectCsvFormula
│   │   │   └── dateUtils.ts               # Formatação de datas para nome de arquivo
│   │   └── types/
│   │       └── ofx.d.ts                   # Tipagens para ofx-js
│   ├── uploads/                           # Arquivos temporários (volume Docker / gitignore)
│   ├── exports/                           # CSVs gerados para download (volume Docker)
│   ├── Dockerfile
│   ├── .env
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── index.css
    │   ├── components/
    │   │   ├── UploadZone.tsx             # Passo 1: drag-and-drop, múltiplos arquivos
    │   │   ├── TabelaConciliacao.tsx      # Passo 2: tabela principal com cores por status
    │   │   ├── TotalizadoresBar.tsx       # Barra de totais em tempo real (BRL)
    │   │   ├── FiltroRapido.tsx           # Toggle: Ver Tudo / Ver Indefinidos
    │   │   ├── ModalEdicao.tsx            # Modal duplo clique → editar descrição/obs
    │   │   ├── PainelRegras.tsx           # CRUD de regras com subcategoria
    │   │   └── BotaoGerarExtratos.tsx     # Passo 3: gerar e baixar CSVs
    │   ├── pages/
    │   │   ├── HomePage.tsx               # Orquestra os 3 passos
    │   │   └── RegrasPage.tsx             # Gerenciamento de regras
    │   ├── hooks/
    │   │   ├── useTransacoes.ts           # Estado e operações das transações
    │   │   └── useRegras.ts               # Estado e operações das regras
    │   ├── services/
    │   │   └── api.ts                     # Chamadas axios para o backend
    │   └── types/
    │       └── index.ts                   # Interfaces TypeScript compartilhadas
    ├── Dockerfile                         # Vite dev server (perfil dev)
    ├── Dockerfile.prod                    # Build estático servido por Nginx (perfil prod)
    ├── nginx.conf
    └── package.json
```

---

## Banco de Dados (PostgreSQL + Prisma 7)

### Configuração do Prisma 7

O Prisma 7 separa a configuração da conexão do schema. O arquivo `backend/prisma.config.ts` define o datasource:

```typescript
// backend/prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

O `schema.prisma` **não** inclui bloco `datasource { url }` — isso é exclusivo do `prisma.config.ts`.

O `PrismaClient` é instanciado via `@prisma/adapter-pg` em `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
export const prisma = new PrismaClient({ adapter });
```

### Schema (`prisma/schema.prisma`)

```prisma
model Transacao {
  id               String        @id @default(uuid())
  dataTransacao    DateTime      @map("data_transacao")
  descricao        String
  valor            Decimal       @db.Decimal(12, 2)
  tipo             Tipo
  classificacao    Classificacao @default(INDEFINIDO)
  categoriaGenerica String?      @map("categoria_generica")
  hashTransacao    String        @unique @map("hash_transacao")
  observacao       String?
  arquivoOrigem    String        @map("arquivo_origem")
  criadoEm         DateTime      @default(now()) @map("criado_em")
  atualizadoEm     DateTime      @updatedAt @map("atualizado_em")

  @@map("transacoes")
}

model Regra {
  id            Int       @id @default(autoincrement())
  palavraChave  String    @map("palavra_chave")
  categoria     Categoria
  subCategoria  String?   @map("sub_categoria")
  prioridade    Int       @default(0)

  @@map("regras")
}

enum Tipo          { ENTRADA  SAIDA }
enum Classificacao { PESSOAL  EMPRESA  INDEFINIDO }
enum Categoria     { PESSOAL  EMPRESA }
```

### Seed (`prisma/seed.ts`)

O seed popula a tabela `regras` com categorias e subcategorias detalhadas:

| categoria | subCategoria | exemplos de palavraChave | prioridade |
|---|---|---|---|
| PESSOAL | Transporte | UBER, 99POP, CABIFY | 1 |
| PESSOAL | Alimentação | IFOOD, UBER EATS, RAPPI | 1 |
| PESSOAL | Entretenimento | NETFLIX, SPOTIFY, STEAM | 1 |
| PESSOAL | Compras Online | AMAZON, MERCADO LIVRE | 1 |
| PESSOAL | Saúde | FARMACIA, DROGA RAIA | 2 |
| PESSOAL | Alimentação | SUPERMERCADO, PADARIA | 2 |
| EMPRESA | Imposto | SIMPLES NACIONAL, DAS, DARF | 1 |
| EMPRESA | Folha de Pagamento | PROLABORE, FGTS, INSS | 1 |
| EMPRESA | Aluguel | ALUGUEL, CONDOMINIO, SINDICO | 1 |
| EMPRESA | Fornecedor | FORNECEDOR, CNPJ, NOTA FISCAL | 1 |
| ... | ... | ... | ... |

---

## Backend — Regras de Implementação

### 1. Upload e Validação (`uploadMiddleware.ts`)

- Usar **Multer** com `memoryStorage`.
- **Aceitar `.csv`, `.ofx`, `.xls` e `.xlsx`** — rejeitar qualquer outro tipo:
  - Validar pela extensão do arquivo (`path.extname`) E pelo `mimetype`.
  - Retornar erro 400 com mensagem clara se inválido.
- Tamanho máximo: configurável via `MAX_FILE_SIZE_MB` (padrão 10MB).
- Até **50 arquivos por requisição**, campo `arquivos` (plural).
- Nunca executar arquivos recebidos. Tratar todo conteúdo como dado.

### 2. Parser de Arquivos (`parserService.ts` e `parser/`)

O parser é dividido em módulos especializados. A fachada `parserService.ts` delega para o parser correto com base na extensão.

Todos retornam o mesmo formato:

```typescript
interface TransacaoRaw {
  dataTransacao: Date;
  descricao: string;
  valor: number;       // positivo = entrada, negativo = saída
  arquivoOrigem: string;
}
```

- **CSV** (`csvParser.ts`): Usa `csv-parser`. Detecta separador (vírgula ou ponto-e-vírgula). Suporta UTF-8 e ISO-8859-1 (Latin-1) via `iconv-lite`.
- **OFX** (`ofxParser.ts`): Usa `ofx-js`. Extrai `<DTPOSTED>`, `<TRNAMT>`, `<MEMO>` ou `<NAME>`.
- **XLS/XLSX** (`spreadsheetParser.ts`): Usa `xlsx`. Detecta colunas automaticamente via `localizarColunasTransacao`.
- **Funções compartilhadas** (`common.ts`): `parseDataGenerica`, `extrairValorLinha`, `localizarColunasTransacao`.
- Ignorar linhas sem data, sem valor ou com valor = 0.

### 3. Normalização de Strings (`utils/normalization.ts`)

Três funções utilitárias usadas por todo o sistema:

```typescript
// Remove caracteres de controle, normaliza unicode, trim
sanitizeTextInput(value: unknown): string

// Remove acentos, uppercase, remove stopwords bancárias (PIX, PAGAMENTO, etc.)
normalizeForMatching(value: unknown, options?): string

// Prepend ' se a string começar com =, +, -, @ (proteção CSV injection)
protectCsvFormula(value: unknown): string
```

`normalizeForMatching` remove stopwords bancárias comuns (PIX, TED, DOC, PAGAMENTO, COMPRA, DEBITO, etc.) para que a classificação seja feita pelo nome do estabelecimento, não pela natureza da operação.

### 4. Motor de Regras (`classificadorService.ts`)

```typescript
interface ResultadoClassificacao {
  classificacao: 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
  categoriaGenerica: string | null;  // subCategoria da regra que fez match
}

function classificar(descricao: string, regras: Regra[]): ResultadoClassificacao
```

- Normaliza a descrição via `normalizeForMatching` com remoção de stopwords.
- Ordena regras por prioridade (menor número = maior prioridade).
- Busca correspondência por `includes` (substring) em cada palavra-chave da regra.
- Retorna também a `categoriaGenerica` (subCategoria da regra que deu match).
- Carregar as regras do banco **uma vez por upload** (não por transação).

### 5. Hash de Transação (`hashService.ts`)

```typescript
// SHA-256 de: "YYYY-MM-DD|valor|descricao_trimmed_lower"
function gerarHash(data: Date, valor: number, descricao: string): string
```

- Garantia de idempotência: inserir o mesmo extrato duas vezes não duplica transações.
- Duplicatas (erro Prisma P2002) são ignoradas silenciosamente.
- A contagem de duplicatas é retornada ao frontend.

### 6. Upload em Lotes (`uploadController.ts`)

- Processa múltiplos arquivos em paralelo (`Promise.all`).
- Salva no banco em lotes de **40 transações** (`Promise.allSettled`) para evitar sobrecarga.
- Retorna `{ importadas, duplicadas, indefinidas, transacoes }`.

### 7. Exportação (`exportService.ts`)

- Gera dois arquivos na pasta `exports/`:
  - `extrato_pessoal_DD-MM-YYYY.csv`
  - `extrato_empresa_DD-MM-YYYY.csv`
- Colunas dos arquivos exportados:
  ```
  data_transacao; descricao; valor; tipo; classificacao; categoria_generica; observacao
  ```
- Separador **ponto-e-vírgula** (`;`) para compatibilidade com Excel Brasil.
- Encoding **UTF-8 com BOM** (`\uFEFF`) para Excel não quebrar acentos.
- Valores monetários formatados com vírgula decimal (`1234,56`).
- `protectCsvFormula` aplicado em `descricao` e `observacao`.

### 8. API Routes

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/upload` | Recebe arquivos (campo `arquivos`), processa, classifica e salva |
| `GET` | `/api/transacoes` | Lista todas as transações |
| `PATCH` | `/api/transacoes/:id` | Atualiza classificação e/ou observação |
| `DELETE` | `/api/transacoes` | Remove todas as transações |
| `GET` | `/api/regras` | Lista todas as regras |
| `POST` | `/api/regras` | Cria nova regra |
| `PUT` | `/api/regras/:id` | Atualiza regra existente |
| `DELETE` | `/api/regras/:id` | Remove regra |
| `POST` | `/api/export` | Gera e retorna os dois CSVs |
| `GET` | `/api/health` | Health check |

**Resposta padrão de upload:**
```json
{
  "importadas": 87,
  "duplicadas": 3,
  "indefinidas": 12,
  "transacoes": [ ...array de transações com classificação aplicada... ]
}
```

---

## Frontend — Regras de Implementação

### Passo 1 — Upload (`UploadZone.tsx`)

- Área de drag-and-drop com feedback visual.
- Aceitar `.csv`, `.ofx`, `.xls` e `.xlsx` (validar no `accept` do input E antes de enviar).
- Suportar múltiplos arquivos na mesma requisição.
- Spinner durante o upload/processamento.
- Após sucesso: ir automaticamente para o Passo 2.
- Em caso de erro: exibir mensagem descritiva.

### Passo 2 — Tabela de Conciliação (`TabelaConciliacao.tsx`)

**Cores das linhas:**
- Verde (`bg-green-50` com borda `border-green-400`): classificação PESSOAL
- Azul (`bg-blue-50` com borda `border-blue-400`): classificação EMPRESA
- Vermelho (`bg-red-50` com borda `border-red-400`): INDEFINIDO

**Colunas da tabela:**
```
Data | Descrição | Valor | Tipo | Classificação | Observação | Ações
```

**Comportamentos:**
- Duplo clique em qualquer célula de uma linha → abre `ModalEdicao` para editar descrição e/ou observação.
- Linhas INDEFINIDAS mostram botões `[Pessoal]` e `[Empresa]` na coluna Ações.
- Linhas já classificadas mostram apenas um ícone de edição (lápis) na coluna Ações.
- Filtro rápido no topo: `[Ver Tudo]` | `[Ver só Indefinidos (12)]`.
- Ordenação padrão: por data de transação, mais recente primeiro.

**Totalizadores (`TotalizadoresBar.tsx`):**
```
Pessoal: R$ 2.847,50  |  Empresa: R$ 8.193,20  |  Total: R$ 11.040,70  |  Indefinidos: 12
```
- Recalcular em tempo real a cada classificação.
- Formatar valores em Real brasileiro: `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.

### Passo 3 — Geração de Extratos (`BotaoGerarExtratos.tsx`)

- Botão **visível mas desabilitado** enquanto houver transações INDEFINIDAS.
- Tooltip no botão desabilitado: "Classifique todas as transações antes de gerar".
- Ao clicar: chamar `POST /api/export`, aguardar e fazer download dos dois arquivos automaticamente.
- Animação de loading durante a geração.

### Gerenciador de Regras (`PainelRegras.tsx` / `RegrasPage.tsx`)

- Tabela: palavra-chave | subcategoria | categoria | prioridade | ações (editar/excluir).
- Formulário para adicionar nova regra: palavra-chave, subcategoria, categoria, prioridade.
- Dica na interface: "Separe múltiplas palavras-chave por vírgula. Ex: IFOOD, RAPPI, UBER".

---

## Tipos TypeScript Compartilhados (`frontend/src/types/index.ts`)

```typescript
export type Classificacao = 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
export type Tipo = 'ENTRADA' | 'SAIDA';
export type Categoria = 'PESSOAL' | 'EMPRESA';

export interface Transacao {
  id: string;
  dataTransacao: string;       // ISO date string
  descricao: string;
  valor: number;
  tipo: Tipo;
  classificacao: Classificacao;
  categoriaGenerica?: string | null;
  hashTransacao: string;
  observacao?: string;
  arquivoOrigem?: string;
}

export interface Regra {
  id: number;
  palavraChave: string;
  categoria: Categoria;
  subCategoria?: string | null;
  prioridade: number;
}

export interface RespostaUpload {
  importadas: number;
  duplicadas: number;
  indefinidas: number;
  transacoes: Transacao[];
}
```

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/conciliacao_financeira"
PORT=3001
CORS_ORIGIN=http://localhost:5173
UPLOADS_DIR=./uploads
EXPORTS_DIR=./exports
MAX_FILE_SIZE_MB=10
```

### Frontend (Vite)

```env
VITE_API_URL=http://localhost:3001/api
```

### Docker Compose (variáveis opcionais no `.env` raiz)

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=conciliacao_financeira
```

---

## Segurança — Requisitos Obrigatórios

- **Nunca executar conteúdo de arquivos recebidos.** Todo arquivo é tratado como dado bruto.
- **Sanitizar** todas as strings vindas do CSV/OFX/XLSX antes de inserir no banco (usar Prisma parameterized queries — nunca SQL raw com interpolação).
- **Validar tipos** de arquivo tanto pelo `mimetype` quanto pela extensão.
- **Limite de tamanho** de arquivo configurável via variável de ambiente.
- **CORS** configurado explicitamente para aceitar apenas a origem do frontend em produção (via `CORS_ORIGIN`).
- Input do usuário no frontend (observação, novas regras): tratar como texto puro (não renderizar como HTML).
- `protectCsvFormula` aplicado em todos os campos de texto exportados para o CSV.
- Sem autenticação nesta versão (sistema local/uniusuário), mas estruturado de forma que seja fácil adicionar JWT no futuro.

---

## Convenções de Código

- **Linguagem:** TypeScript estrito (`strict: true` no `tsconfig.json`).
- **Nomenclatura:** camelCase para variáveis/funções, PascalCase para tipos/componentes, snake_case para colunas do banco.
- **Comentários:** apenas onde a lógica não é óbvia (especialmente no motor de regras e no parser OFX).
- **Commits:** mensagens em português, imperativo: "Adiciona parser OFX", "Corrige cálculo de totalizadores".
- **Tratamento de erros:** sempre retornar mensagens de erro legíveis ao usuário final, não stack traces.
- **Logs:** usar `console.error` apenas em catch blocks; evitar `console.log` em produção.

---

## Fluxo Completo (referência rápida)

```
Usuário arrasta .csv, .ofx, .xls ou .xlsx
        ↓
[Multer] Recebe e valida extensão/mimetype (até 50 arquivos por vez)
        ↓
[parserService] Delega para csvParser / ofxParser / spreadsheetParser
        ↓
[hashService] Gera hash SHA-256 por transação (data|valor|descricao)
        ↓
[classificadorService] Aplica regras do banco → PESSOAL | EMPRESA | INDEFINIDO + categoriaGenerica
        ↓
[Prisma] Salva em lotes de 40 (ignora duplicatas por hash único)
        ↓
[Frontend] Exibe tabela colorida com totalizadores em tempo real
        ↓
Usuário classifica os INDEFINIDOS manualmente (ou edita observações)
        ↓
[PATCH /api/transacoes/:id] Salva cada classificação no banco em tempo real
        ↓
Botão "Gerar Extratos" fica ativo (zero INDEFINIDOS)
        ↓
[exportService] Gera extrato_pessoal_DD-MM-YYYY.csv e extrato_empresa_DD-MM-YYYY.csv
        ↓
Download automático dos dois arquivos no browser
```

---

## Comandos de Desenvolvimento

```bash
# Rodar backend + frontend simultaneamente (sem Docker)
npm run dev

# Somente backend
npm run backend

# Somente frontend
npm run frontend

# Docker — perfil de desenvolvimento (Vite HMR)
npm run docker:up

# Docker — perfil de produção (Nginx)
npm run docker:up:prod

# Ver logs dos containers
npm run docker:logs

# Verificar se backend e frontend estão respondendo
npm run docker:healthcheck

# Parar containers
npm run docker:down

# Parar e remover volumes (reset completo do banco)
npm run docker:down:volumes
```

### Backend — scripts diretos

```bash
cd backend
npm run dev          # nodemon + ts-node
npm run build        # compilar TypeScript
npm run seed         # popular regras iniciais
npm run db:migrate   # prisma migrate deploy
```

### Frontend — scripts diretos

```bash
cd frontend
npm run dev          # Vite dev server
npm run build        # build de produção
```
