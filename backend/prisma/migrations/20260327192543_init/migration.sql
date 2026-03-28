-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_transacao" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL DEFAULT 'INDEFINIDO',
    "categoria_generica" TEXT,
    "hash_transacao" TEXT NOT NULL,
    "codigo_referencia" TEXT,
    "identificador" TEXT NOT NULL DEFAULT '',
    "arquivo_origem" TEXT NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "regras" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "palavra_chave" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "sub_categoria" TEXT,
    "prioridade" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_hash_transacao_key" ON "transacoes"("hash_transacao");

-- CreateIndex
CREATE UNIQUE INDEX "regras_palavra_chave_categoria_prioridade_key" ON "regras"("palavra_chave", "categoria", "prioridade");
