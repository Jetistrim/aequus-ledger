# Empacotamento — Executável Único com caxa

Este documento descreve como transformar o projeto em um executável
autossuficiente (`conciliacao-financeira.exe` no Windows) usando
[caxa](https://github.com/nicolo-ribaudo/caxa).

---

## Visão Geral

```
npm run release
```

Este comando único executa toda a pipeline em sequência:

1. Compila o backend (TypeScript → CommonJS via `tsc`).
2. Compila o frontend (Vite → assets estáticos).
3. Monta o diretório `release/` com código, assets e dependências de produção.
4. Empacota `release/` em `artifacts/conciliacao-financeira[.exe]` com caxa.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| Node.js | 20 LTS | Runtime embutido pelo caxa ao empacotar |
| npm | 10+ | Usado no build e no `npm ci` dentro do release |
| better-sqlite3 | já incluso | Módulo nativo — compile no mesmo OS/arch do alvo |

> **Módulo nativo:** `better-sqlite3` usa um binário compilado (`.node`).
> O executável precisa ser gerado na mesma plataforma (Windows x64 → Windows x64).
> Cross-compilation não é suportada via caxa sem recompilar o addon.

---

## Estrutura do `release/`

Após `npm run build:release`, a pasta fica:

```
release/
├── dist/                   ← backend compilado (CommonJS)
│   ├── packaged-entrypoint.js
│   ├── index.js
│   ├── seed.js
│   ├── lib/
│   ├── runtime/
│   ├── controllers/
│   ├── services/
│   └── public/             ← frontend compilado (Vite build)
│       ├── index.html
│       └── assets/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── node_modules/           ← somente dependências de produção (--omit=dev)
├── package.json
└── package-lock.json
```

O `node_modules/@prisma/client` é gerado para SQLite dentro desta pasta
durante o build (passo `prisma generate`).

---

## Como o caxa funciona

O caxa:

1. Comprime todo o diretório `release/` em um arquivo auto-extraível.
2. Na primeira execução, extrai para `%TEMP%/caxa/<hash>/` (Windows) ou
   equivalente no macOS/Linux.
3. Executa o entrypoint informado usando o runtime embutido.

A variável de substituição `{{caxa}}` dentro do comando é expandida em tempo
de execução para o diretório de extração.

**Entrypoint configurado:**

```
{{caxa}}/node_modules/.bin/node  {{caxa}}/dist/packaged-entrypoint.js
```

---

## packaged-entrypoint.ts

Arquivo: `backend/src/packaged-entrypoint.ts` → compilado para
`release/dist/packaged-entrypoint.js`.

Responsabilidades na ordem de execução:

1. Define `process.env['CAXA'] = 'true'` antes de qualquer import — isso
   faz `resolveRuntimePaths()` escolher o diretório de dados do usuário.
2. Carrega variáveis de ambiente via `dotenv/config` (`.env` ao lado do executável).
3. Chama `applyRuntimeEnvironment()` que resolve `DATABASE_URL` para o
   SQLite de dados persistentes do usuário.
4. Executa `prisma migrate deploy` para criar/atualizar o schema sem depender
   de internet ou CLI interativa.
5. Executa `dist/seed.js` em todo startup (seed idempotente por `upsert`).
6. Faz `require('./index')` para iniciar o servidor Express.

Observabilidade de startup:

- Cada etapa de setup registra início, término e duração em milissegundos.
- Em caso de falha, o log inclui a etapa e o tempo decorrido até o erro.

---

## Diretórios de Dados por Plataforma

Quando `CAXA=true`, o runtime persiste os dados em:

| Plataforma | Caminho |
|---|---|
| Windows | `%LOCALAPPDATA%\ConciliacaoFinanceira\` |
| macOS | `~/Library/Application Support/ConciliacaoFinanceira/` |
| Linux | `~/.local/share/ConciliacaoFinanceira/` |

Dentro desse diretório:

```
ConciliacaoFinanceira/
├── data/
│   └── conciliacao.sqlite   ← banco de dados persistente
├── exports/                 ← CSVs gerados para download
├── uploads/                 ← arquivos temporários de upload
├── active-instance.json     ← metadados da instância em execução
└── instance.lock            ← lock para garantir instância única
```

---

## Comportamento em Modo Empacotado

### Instância única

Ao ser iniciado, o executável tenta adquirir o lock em
`<dataDir>/instance.lock`.

- **Nenhuma instância rodando:** adquire o lock, sobe o servidor normalmente.
- **Instância já rodando:** lê `active-instance.json`, abre o navegador para
  a URL existente e encerra imediatamente — sem subir um segundo servidor.

### Abertura automática do navegador

Após subir, o servidor detecta `CAXA=true` e abre automaticamente a URL
no navegador padrão do sistema:

| Plataforma | Comando |
|---|---|
| Windows | `start "" "http://..."` |
| macOS | `open "http://..."` |
| Linux | `xdg-open "http://..."` |

Se o navegador não puder ser aberto, o servidor imprime a URL no console
e continua normalmente.

### Bandeja do sistema

O servidor registra um ícone na bandeja do sistema (system tray) com duas
opções:

- **Abrir no navegador** — abre a interface no navegador padrão.
- **Encerrar** — envia SIGTERM e encerra o processo cleanly.

O ícone é gerado a partir de uma constante base64 embutida no código:

- `backend/src/runtime/trayManager.ts` → constantes `ICON_ICO_BASE64`
  (Windows) e `ICON_PNG_BASE64` (macOS / Linux).
- O arquivo é escrito em `os.tmpdir()/conciliacao-icon/` na primeira
  inicialização e reutilizado enquanto o processo estiver ativo.
- Se o `systray2` não estiver disponível (ambiente headless / servidor),
  o servidor sobe sem bandeja — não é um erro fatal.

### Fallback de porta

O servidor tenta `PORT` (padrão `3001`). Se a porta estiver ocupada, tenta
as próximas `PORT_FALLBACK_SPAN` portas (padrão `20`). Se todas estiverem
ocupadas, usa uma porta efêmera livre escolhida pelo sistema operacional.

A URL efetiva é sempre a que está em `active-instance.json`.

### Frontend embutido

Em modo empacotado (e em modo produção Docker), o próprio backend Express
serve o frontend compilado diretamente de `dist/public/`:

- Assets estáticos (JS, CSS, imagens) → `express.static` com ETag e sem
  directory listing.
- Qualquer rota que não começa com `/api/` → retorna `dist/public/index.html`
  para que o roteador React assuma o controle.
- Rotas `/api/*` têm prioridade e nunca são interceptadas pelo fallback SPA.

---

## Scripts de Build

| Script | Comando | Descrição |
|---|---|---|
| `build:backend` | `npm run build --prefix backend` | `tsc` → `backend/dist/` |
| `build:frontend` | `npm run build --prefix frontend` | Vite → `frontend/dist/` |
| `build:release` | `node scripts/build-release.mjs` | Monta `release/` completo |
| `package:caxa` | `node scripts/package-caxa.mjs` | Cria executável em `artifacts/` |
| `release` | `build:release && package:caxa` | Pipeline completa |

Os diretórios `release/` e `artifacts/` estão no `.gitignore` raiz.

---

## Fluxo Completo de Release

```
npm run release
    │
    ├─ build:release (scripts/build-release.mjs)
    │       ├─ rm -rf release/
    │       ├─ tsc → backend/dist/
    │       ├─ vite build → frontend/dist/
    │       ├─ cp backend/dist/ → release/dist/
    │       ├─ cp frontend/dist/ → release/dist/public/
    │       ├─ cp backend/prisma/ → release/prisma/
    │       ├─ cp package.json + package-lock.json → release/
    │       ├─ npm ci --omit=dev (dentro de release/)
    │       └─ prisma generate --schema release/prisma/schema.prisma
    │
    └─ package:caxa (scripts/package-caxa.mjs)
            ├─ valida que release/ existe
            ├─ detecta plataforma (ext .exe no Windows)
            └─ caxa --input release --output artifacts/conciliacao-financeira[.exe]
                    --exclude **/*.map **/*.d.ts **/test/**
                    -- "{{caxa}}/node_modules/.bin/node"
                       "{{caxa}}/dist/packaged-entrypoint.js"
```

---

## Troubleshooting

**Erro ao iniciar o executável — "database is locked"**
Outra instância pode estar rodando. Encerre pelo ícone da bandeja ou encerre
o processo `node` via Gerenciador de Tarefas. O lock em
`%LOCALAPPDATA%\ConciliacaoFinanceira\instance.lock` é removido
automaticamente quando o processo termina corretamente.

**Ícone da bandeja não aparece**
O `systray2` usa um helper Go nativo. Em ambientes com antivírus restritivos,
o helper pode ser bloqueado. O servidor continua funcionando; acesse pelo
navegador diretamente.

**Migração falha ao iniciar**
Verifique se o path do SQLite está acessível e se o usuário tem permissão de
escrita em `%LOCALAPPDATA%\ConciliacaoFinanceira\`. O log de erro é exibido
no console antes do processo encerrar.

**Frontend não abre (browser não abre automaticamente)**
O servidor imprime a URL no console. Acesse manualmente em
`http://127.0.0.1:<porta>`.
