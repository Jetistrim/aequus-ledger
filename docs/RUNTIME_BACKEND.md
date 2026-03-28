# Runtime Do Backend

Este documento cobre a base já implementada para o runtime local do backend. Ele existe para evitar dois problemas recorrentes:

1. banco SQLite surgindo em local inesperado por causa de path relativo,
2. aplicação falhando quando a porta preferida já está ocupada.

## Diretório De Runtime

No modo local padrão, o backend passa a resolver seus artefatos operacionais dentro de `backend/.runtime/`.

Estrutura esperada:

```text
backend/.runtime/
├── active-instance.json
├── instance.lock
├── data/
├── exports/
└── uploads/
```

Objetivo:

1. separar artefatos operacionais do código-fonte,
2. evitar dependência implícita de `process.cwd()`,
3. preparar o caminho para o runtime empacotado usar diretório persistente do usuário.

## Banco SQLite

Quando `DATABASE_URL` não é fornecida, o backend usa por padrão:

```text
backend/.runtime/data/conciliacao.sqlite
```

Quando `DATABASE_URL` usa `file:` com caminho relativo, o runtime normaliza esse caminho para absoluto.

Regra importante:

1. em modo local, caminho relativo continua ancorado no diretório de execução do backend;
2. em modo empacotado, caminho relativo deve ser ancorado no diretório persistente da aplicação, nunca na `Temp` do Windows.

## Porta Preferida E Fallback

O backend continua preferindo a porta definida em `PORT`, com padrão `3001`.

Se essa porta estiver ocupada por outra aplicação, o bootstrap tenta portas subsequentes dentro de uma faixa controlada por `PORT_FALLBACK_SPAN`.

Se toda a faixa estiver ocupada, o runtime ainda faz fallback final para uma porta efêmera livre escolhida pelo sistema operacional.

Isso garante que o backend continue subindo mesmo com conflito na porta principal.

## Metadados Da Instância Ativa

Quando o backend termina o bind da porta, ele grava `backend/.runtime/active-instance.json` com dados como:

1. `pid`,
2. `preferredPort`,
3. `port`,
4. `url`,
5. `healthUrl`,
6. `startedAt`.

Esse arquivo é a fonte de verdade para scripts auxiliares que precisam descobrir a URL efetiva do backend.

Importante:

1. o arquivo só é publicado depois que a porta efetiva é conhecida,
2. nenhum metadata transitório com porta `0` deve ser exposto para scripts consumidores.

## Lock De Instância

O arquivo `backend/.runtime/instance.lock` é usado como base para exclusividade de instância.

Comportamento atual:

1. o backend tenta criar o lock de forma exclusiva,
2. se o lock já existir, ele verifica se a instância anterior ainda está viva,
3. se o lock estiver órfão, o runtime limpa o estado e tenta novamente.

Isso prepara o fluxo de instância única do executável, mesmo antes da parte de bandeja do sistema estar concluída.

## Fluxo Dev Pela Raiz

O comando `npm run dev` na raiz agora usa `scripts/start-frontend-dev.mjs`.

Esse script:

1. espera o backend publicar `active-instance.json`,
2. lê a URL efetiva da instância ativa,
3. sobe o Vite com `VITE_API_PROXY_TARGET` apontando para essa URL.

Na prática, isso evita quebrar o frontend dev quando `3001` já está ocupada.

## Variáveis Relevantes

```env
APP_RUNTIME_MODE=local|docker|packaged
APP_DATA_DIR=/caminho/base/de/runtime
DATABASE_URL=file:./prisma/dev.db
PORT=3001
PORT_FALLBACK_SPAN=20
HOST=127.0.0.1
PUBLIC_HOST=127.0.0.1
```

## Documentação Relacionada

- [PACKAGING.md](./PACKAGING.md) — empacotamento com caxa, diretórios de
  dados por plataforma, bandeja do sistema, abertura automática do navegador.
