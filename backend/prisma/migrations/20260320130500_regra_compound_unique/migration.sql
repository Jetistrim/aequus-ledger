-- Remove duplicidades mantendo a menor id por chave de identidade da regra
DELETE FROM "regras" r1
USING "regras" r2
WHERE r1.id > r2.id
  AND r1.palavra_chave = r2.palavra_chave
  AND r1.categoria = r2.categoria
  AND r1.prioridade = r2.prioridade;

-- Garante idempotencia do seed por chave composta
CREATE UNIQUE INDEX "regras_palavra_chave_categoria_prioridade_key"
ON "regras"("palavra_chave", "categoria", "prioridade");
