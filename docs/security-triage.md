# Security Triage

## Objetivo

Separar vulnerabilidades de runtime das vulnerabilidades de build/bootstrap para priorizar correcoes com impacto real no ambiente de producao.

## Escopo de Runtime em Producao

- `conciliaofinanceira-frontend-prod` (Nginx)
- `conciliaofinanceira-backend-prod` (Node + app compilada)

## Escopo de Build/Bootstrap

- `conciliaofinanceira-backend-init` (container one-shot para migrate + seed)
- estagios `build` dos Dockerfiles

## Achados Observados

1. Alertas de imagem base Node e Nginx sao comuns mesmo em imagens oficiais e atualizadas.
2. Alertas no estagio `build` do frontend nao ficam expostos em runtime no profile prod.
3. Alertas ligados ao toolchain Prisma aparecem no audit de dependencias de desenvolvimento e no container de bootstrap.

## Decisoes Tecnicas Aplicadas

1. Runtime do backend separado do bootstrap de banco.
2. API em producao sem porta exposta publicamente.
3. Banco em producao sem porta exposta publicamente.
4. Frontend de producao com HTTPS no Nginx e proxy interno para API.
5. Containers com hardening basico: `no-new-privileges`, `cap_drop: ALL`, `pids_limit`, filesystem readonly no frontend prod.
6. Scan automatizado com Trivy no GitHub Actions para bloquear regressao de `CRITICAL/HIGH`.

## Pendencias Recomendadas

1. Substituir certificado self-signed por certificado valido em `frontend/certs/tls.crt` e `frontend/certs/tls.key` no deploy.
2. Monitorar e atualizar periodicamente as tags de imagem base.
3. Revisar advisories do Prisma a cada atualizacao de major/minor.

## Excecoes Temporarias no Trivy

1. `CVE-2026-29087` e `CVE-2026-29045` foram classificados como risco de toolchain (dependencia transitiva do Prisma usada fora do runtime da API).
2. `CVE-2023-30533` e `CVE-2024-22363` em `xlsx` permanecem monitorados porque as versoes corrigidas referenciadas pelo scanner nao estao publicadas no npm publico.
3. As excecoes estao registradas em `.trivyignore` e devem ser removidas assim que houver versoes corrigidas aplicaveis.
