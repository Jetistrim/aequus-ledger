# Empacotamento — Pasta Portatil ZIP

Este documento descreve como gerar a distribuicao portatil da aplicacao:
uma pasta ZIP auto-suficiente com Node.js embutido. O usuario descompacta
e executa `start.bat`.

## Visao Geral

```bash
npm run release:portable
```

Pipeline executada:

1. Compila backend (TypeScript -> CommonJS).
2. Compila frontend (Vite build).
3. Monta `portable/` com codigo, assets, dependencias de producao e Node.
4. Compacta em `artifacts/conciliacao-portable-<versao>-win-x64.zip`.

## Pre-requisitos

| Ferramenta | Versao minima | Observacao |
|---|---|---|
| Node.js | 20 LTS | Copiado para `portable/runtime/node.exe` |
| npm | 10+ | Usado no build e no `npm ci` dentro de `portable/` |
| better-sqlite3 | incluso | Modulo nativo, build no mesmo OS/arch de destino |
| PowerShell | 5.1+ | Usado por `Compress-Archive` no script de zip |

## Estrutura do Diretorio Portable

```text
portable/
├── dist/
│   ├── portable-entrypoint.js
│   ├── index.js
│   ├── seed.js
│   └── public/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── node_modules/
├── runtime/
│   └── node.exe
├── package.json
├── package-lock.json
├── start.bat
└── start.ps1
```

## Entrypoint Portatil

Arquivo-fonte: `backend/src/portable-entrypoint.ts`

Responsabilidades:

1. Define `PORTABLE_RUNTIME=true` antes de qualquer import de runtime.
2. Aplica paths de runtime e cria diretorios operacionais.
3. Executa `prisma migrate deploy`.
4. Executa seed idempotente.
5. Inicia o servidor via `require('./index')`.

## Dados Em Runtime Portatil

No modo portatil, os dados ficam ao lado da aplicacao:

```text
<raiz-portable>/
├── data/
│   └── conciliacao.sqlite
├── exports/
├── uploads/
├── active-instance.json
└── instance.lock
```

## Comportamento Em Execucao

- Instancia unica via lock file.
- Abertura automatica do navegador ao iniciar.
- Icone de bandeja quando `systray2` estiver disponivel.
- Fallback de porta com base em `PORT` e `PORT_FALLBACK_SPAN`.
- Frontend servido por `dist/public` no proprio backend.

## Scripts Relevantes

| Script | Comando | Descricao |
|---|---|---|
| `build:portable` | `node scripts/build-portable.mjs` | Monta `portable/` |
| `zip:portable` | `node scripts/zip-portable.mjs` | Gera ZIP em `artifacts/` |
| `release:portable` | `npm run build:portable && npm run zip:portable` | Pipeline completa |

## Troubleshooting

- Se o zip falhar, confirme que `portable/` existe e execute `npm run build:portable` antes.
- Se `better-sqlite3` falhar no alvo, gere o pacote no mesmo ambiente Windows x64.
- Se a bandeja nao aparecer, o servidor continua funcional; abra a URL impressa no console.
