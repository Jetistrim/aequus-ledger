# Frontend — Conciliação Financeira

Interface React 19 + TypeScript + Vite 6 para upload de extratos, revisão de transações e geração dos CSVs de exportação.

---

## Pré-requisitos

- Node.js 20+
- Backend rodando em `http://localhost:3001` (ou via Docker Compose na raiz)

---

## Scripts

```bash
npm run dev      # servidor de desenvolvimento Vite em http://localhost:5173
npm run build    # build de produção em dist/
npm run preview  # preview do build de produção
```

---

## Estrutura

```
frontend/src/
├── main.tsx
├── index.css                    # Tailwind CSS base
├── components/
│   ├── UploadZone.tsx           # Passo 1: drag-and-drop, múltiplos arquivos
│   ├── TabelaConciliacao.tsx    # Passo 2: tabela com cores por classificação
│   ├── TotalizadoresBar.tsx     # Totais em tempo real (R$)
│   ├── FiltroRapido.tsx         # Toggle Ver Tudo / Ver Indefinidos
│   ├── ModalEdicao.tsx          # Edição via duplo clique
│   ├── PainelRegras.tsx         # CRUD de regras com subcategoria
│   └── BotaoGerarExtratos.tsx   # Passo 3: gerar e baixar CSVs
├── pages/
│   ├── HomePage.tsx             # Orquestra os 3 passos
│   └── RegrasPage.tsx           # Gerenciamento de regras
├── hooks/
│   ├── useTransacoes.ts         # Estado e operações das transações
│   └── useRegras.ts             # Estado e operações das regras
├── services/
│   └── api.ts                   # Chamadas axios para o backend
└── types/
    └── index.ts                 # Interfaces TypeScript compartilhadas
```

---

## Fluxo de uso

### Passo 1 — Upload (`UploadZone.tsx`)

- Drag-and-drop de arquivos, seleção manual ou seleção de pasta
- Aceita `.csv`, `.ofx`, `.xls` e `.xlsx`; ao selecionar uma pasta, ignora os incompatíveis
- Interrompe a análise da pasta e alerta o usuário se os arquivos compatíveis ultrapassarem 100MB
- Spinner durante o processamento; redireciona para o Passo 2 ao concluir

### Passo 2 — Conciliação (`TabelaConciliacao.tsx`)

Colunas: `Data | Descrição | Valor | Tipo | Classificação | Observação | Ações`

**Cores das linhas:**
- Verde — PESSOAL
- Azul — EMPRESA
- Vermelho — INDEFINIDO

**Interações:**
- Linhas INDEFINIDAS mostram botões `[Pessoal]` e `[Empresa]`
- Duplo clique em qualquer linha abre o modal de edição
- Filtro rápido: "Ver Tudo" / "Ver só Indefinidos"

**Totalizadores** (recalculados em tempo real):
```
Pessoal: R$ X.XXX,XX  |  Empresa: R$ X.XXX,XX  |  Total: R$ X.XXX,XX  |  Indefinidos: N
```

### Passo 3 — Exportação (`BotaoGerarExtratos.tsx`)

- Botão desabilitado enquanto houver transações INDEFINIDAS
- Ao clicar chama `POST /api/export` e faz download automático dos dois arquivos

---

## Tipos compartilhados (`types/index.ts`)

```typescript
interface Transacao {
  id: string;
  dataTransacao: string;     // ISO date string
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
  classificacao: 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
  categoriaGenerica?: string | null;
  hashTransacao: string;
  observacao?: string;
  arquivoOrigem?: string;
}

interface Regra {
  id: number;
  palavraChave: string;      // lista separada por vírgula
  categoria: 'PESSOAL' | 'EMPRESA';
  subCategoria?: string | null;
  prioridade: number;
}
```

---

## Variáveis de ambiente (Vite)

```env
VITE_API_URL=http://localhost:3001/api
```

Em desenvolvimento via Docker, o Vite usa proxy reverso configurado em `vite.config.ts` — a variável `VITE_API_PROXY_TARGET` aponta para o container do backend.

---

## Build de produção

O `Dockerfile.prod` compila o projeto com `vite build` e serve o resultado via Nginx (`nginx.conf`). O Nginx também faz proxy das requisições `/api/*` para o backend.
