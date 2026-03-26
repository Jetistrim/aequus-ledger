# Testes da Página de Regras

## Escopo

Este documento cobre os testes unitários adicionados para a página de regras e para o novo fluxo de diagnóstico assistido.

## Frontend

### 1. Hook

Arquivo: `frontend/src/hooks/useRegras.test.tsx`

Cenários cobertos:
1. Carregamento inicial de regras ao montar o hook.
2. Criação de regra com manutenção da ordenação por prioridade.
3. Atualização de regra em memória sem recarregar lista completa.
4. Exclusão de regra do estado local.
5. Exposição de erro amigável quando a API falha no carregamento.

### 2. Componente

Arquivo: `frontend/src/components/PainelRegras.test.tsx`

Cenários cobertos:
1. Abertura do modal de teste por botão dedicado.
2. Confirmação obrigatória antes de excluir linha.
3. Contrato de layout para desktop/tablet sem scroll horizontal (`md:overflow-visible`).

### 3. API client

Arquivo: `frontend/src/services/api.regras.test.ts`

Cenários cobertos:
1. Envio de payload para `POST /regras/teste`.
2. Normalização de erro HTTP para `ApiRequestError`.

## Backend

Arquivo: `backend/tests/regras-controller.test.ts`

Novos cenários cobertos no endpoint `POST /api/regras/teste`:
1. Execução em modo `SALVAS` com leitura de regras e indefinidas do banco.
2. Execução em modo `TEMPORARIAS` sem leitura de regras salvas.
3. Execução em modo `AMBAS` com fonte de amostra mista (banco + manual).
4. Validação negativa quando desabilita banco e não informa amostras manuais.
5. Validação negativa para modo de regras inválido.

## Como executar

### Frontend (focado)

```bash
npm run test --prefix frontend -- PainelRegras.test.tsx useRegras.test.tsx api.regras.test.ts
```

### Backend (focado)

```bash
npm run test --prefix backend -- regras-controller.test.ts
```

### Recomendado (completo)

```bash
npm run typecheck
npm run test
```

## Observações

1. O ambiente de testes frontend foi atualizado para `jsdom` para suportar testes de componentes React.
2. Testes incluem comentários inline em cenários críticos para facilitar manutenção.
