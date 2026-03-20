-- Backfill valores nulos antes de aplicar restricao NOT NULL
UPDATE "transacoes"
SET "identificador" = ''
WHERE "identificador" IS NULL;

-- Garante valor padrao para novos registros
ALTER TABLE "transacoes"
ALTER COLUMN "identificador" SET DEFAULT '';

-- Impede nulos na coluna
ALTER TABLE "transacoes"
ALTER COLUMN "identificador" SET NOT NULL;
