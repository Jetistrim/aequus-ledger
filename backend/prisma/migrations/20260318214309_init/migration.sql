-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "Classificacao" AS ENUM ('PESSOAL', 'EMPRESA', 'INDEFINIDO');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('PESSOAL', 'EMPRESA');

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "data_transacao" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "classificacao" "Classificacao" NOT NULL DEFAULT 'INDEFINIDO',
    "hash_transacao" TEXT NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regras" (
    "id" SERIAL NOT NULL,
    "palavra_chave" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "regras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transacoes_hash_transacao_key" ON "transacoes"("hash_transacao");
