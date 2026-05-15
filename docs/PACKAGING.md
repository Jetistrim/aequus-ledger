# Empacotamento — Pasta Portatil ZIP

Este documento descreve como gerar a distribuicao portatil da aplicacao:
uma pasta ZIP auto-suficiente com Node.js embutido. O usuario descompacta
e executa `start.vbs`.

## Visao Geral

```bash
npm run release:portable
```

Ou, para gerar o mesmo ZIP no GitHub e publicar somente apos aprovacao manual:

1. Atualize a versao no `package.json` raiz.
2. Adicione a secao correspondente em `CHANGELOG.md`.
3. Execute o workflow `Release Portable` no GitHub Actions e, se necessario, ajuste o input `release_environment` (padrao: `release`).
4. Revise o artifact gerado.
5. Aprove o job `Publish Tag And Release` no GitHub Environment selecionado.
6. O workflow cria a tag `v<versao>` e a GitHub Release anexando exatamente o mesmo ZIP aprovado.

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
| PowerShell | 5.1+ | Usado com `.NET ZipArchive` no script de zip |

## Estrutura do Diretorio Portable

```text
portable/
├── config/
│   ├── seed-generico.json
│   └── seed-estetica.json
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
├── start.vbs
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

### Regras por JSON no pacote descompactado

Depois de descompactar o ZIP, edite ou adicione seus arquivos `seed-*.json` em:

```text
<raiz-portable>/config/
```

O loader do backend carrega automaticamente todos os `seed-*.json` encontrados nessa pasta.
Isso permite distribuir a mesma base e trocar regras por nicho/empresa sem alterar TypeScript.

### Selecao explicita de seeds no ZIP

O empacotamento portatil agora respeita a lista declarada em `config/portable-seeds.json`.
Somente os arquivos listados em `incluir` entram no ZIP final.

Exemplo:

```json
{
	"incluir": [
		"seed-generico.json",
		"seed-estetica.json"
	]
}
```

Uso recomendado:

- mantenha `seed-generico.json` como base comum
- inclua apenas os nichos/clientes que devem sair naquele pacote
- remova um arquivo da lista para exclui-lo do ZIP sem apagar o fonte do repositório

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
- Segundo clique no atalho abre a instância ja ativa (atalho idempotente).
- Fallback de porta com base em `PORT` e `PORT_FALLBACK_SPAN`.
- Frontend servido por `dist/public` no proprio backend.
- Encerramento via botao `Desligar Sistema` na interface web.
- `start.vbs` inicia a aplicacao sem manter uma janela de terminal aberta.

## Scripts Relevantes

| Script | Comando | Descricao |
|---|---|---|
| `build:portable` | `node scripts/build-portable.mjs` | Monta `portable/` |
| `zip:portable` | `node scripts/zip-portable.mjs` | Gera ZIP em `artifacts/` |
| `release:portable` | `npm run build:portable && npm run zip:portable` | Pipeline completa |

## Publicacao via GitHub Actions

Workflow: `.github/workflows/release-portable.yml`

Fluxo:

1. Roda manualmente via `workflow_dispatch`.
2. Recebe o input `release_environment`, com valor padrao `release`, para definir em qual GitHub Environment o job de publicacao deve aguardar approval.
3. Executa em `windows-latest` para manter compatibilidade com `better-sqlite3`, `node.exe` e o empacotamento ZIP via PowerShell.
4. Valida a versao do `package.json` raiz, exige formato semver e falha se a tag `v<versao>` ja existir.
5. Extrai o corpo da release da secao correspondente em `CHANGELOG.md`.
6. Executa `npm run release:portable` e publica o ZIP como artifact.
7. Aguarda aprovacao humana no GitHub Environment informado no input.
8. Depois da aprovacao, baixa o mesmo artifact, cria a tag anotada e publica a GitHub Release com o mesmo ZIP.

Pre-condicoes:

- Criar o GitHub Environment que sera usado no input `release_environment` com reviewers obrigatorios para que exista approval real.
- Garantir que `package.json` raiz e `CHANGELOG.md` estejam no mesmo commit a ser publicado.
- Manter a versao canonica no `package.json` raiz; o workflow nao usa `backend/package.json` nem `frontend/package.json` para nomear a release.
- O hook `.husky/pre-push` bloqueia pushes que tentem introduzir no branch uma versao do `package.json` raiz que ja exista como tag no remoto.

## Troubleshooting

- Se o zip falhar, confirme que `portable/` existe e execute `npm run build:portable` antes.
- Se um seed esperado nao entrar no ZIP, revise `config/portable-seeds.json`.
- Se `better-sqlite3` falhar no alvo, gere o pacote no mesmo ambiente Windows x64.
- Se o navegador nao abrir automaticamente, abra manualmente a URL salva em `active-instance.json`.
- Se o workflow falhar dizendo que a secao da versao nao existe, confira se `CHANGELOG.md` contem um cabecalho `## <versao>` exatamente igual ao `package.json` raiz.
- Se o job de publicacao nao pausar para aprovacao, confirme a configuracao do GitHub Environment informado em `release_environment`.
- Se o `git push` for bloqueado por versao duplicada, incremente o campo `version` no `package.json` raiz antes de enviar a branch.
