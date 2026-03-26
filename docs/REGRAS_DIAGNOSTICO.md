# Regras de Classificação: Diagnóstico Assistido

## Objetivo

A tela de regras agora possui um fluxo de teste em modal para apoiar ajustes de palavra-chave, categoria, subcategoria e prioridade antes de consolidar alterações.

## Onde acessar

1. Abra a página de regras.
2. Clique em **Abrir Teste de Regras**.
3. Selecione o modo de teste:
- `SALVAS`: somente regras persistidas no banco.
- `TEMPORARIAS`: somente regras informadas no modal.
- `AMBAS`: temporárias + salvas (temporárias têm precedência).

## Fontes de amostra

O teste aceita duas fontes de dados:

1. **Indefinidas do banco**:
- Controlado por `usarIndefinidasBanco`.
- Limite configurável por `limiteAmostras` (1 a 500).

2. **Amostras manuais**:
- Campo texto no formato `descricao;valor;tipo`.
- Uma linha por transação.
- Exemplo: `PIX ENVIADO IFOOD;45.90;SAIDA`.

Quando as duas fontes são usadas, a origem reportada no diagnóstico é `MISTO`.

## Informações exibidas no diagnóstico

O resultado do teste replica a leitura operacional do script de diagnóstico e adiciona projeção de classificação:

1. Resumo de indefinidas (`PIX` vs `Não-PIX`).
2. Distribuição por faixas de valor para PIX e não-PIX.
3. Top descrições PIX e não-PIX.
4. Resumo de classificação atual da amostra.
5. Resumo de classificação após aplicar o modo de teste.
6. Tabela de amostras com mecanismo aplicado (`REGRA_EXPLICITA`, `HEURISTICA_PIX`, `HEURISTICA_NAO_PIX`, `FALLBACK`) e confiança.

## Endpoint backend

`POST /api/regras/teste`

### Payload

```json
{
  "modoRegras": "AMBAS",
  "regrasTemporarias": [
    {
      "palavraChave": "IFOOD,RAPPI",
      "categoria": "PESSOAL",
      "subCategoria": "Alimentacao",
      "prioridade": 1
    }
  ],
  "usarIndefinidasBanco": true,
  "limiteAmostras": 120,
  "amostrasManuais": [
    {
      "descricao": "PIX ENVIADO IFOOD",
      "valor": 45.9,
      "tipo": "SAIDA"
    }
  ]
}
```

### Regras de validação importantes

1. `modoRegras` deve ser `SALVAS`, `TEMPORARIAS` ou `AMBAS`.
2. Se `usarIndefinidasBanco=false`, é obrigatório informar `amostrasManuais`.
3. Máximo de 80 regras temporárias e 300 amostras manuais por requisição.

## Segurança

1. Endpoint é somente leitura (não altera transações nem regras).
2. Entradas textuais passam por sanitização.
3. Limites de volume evitam payload excessivo.
