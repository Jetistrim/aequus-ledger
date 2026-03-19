-- Adiciona coluna arquivo_origem (obrigatória) com 'importado' como valor padrão para linhas existentes
ALTER TABLE "transacoes" ADD COLUMN "arquivo_origem" TEXT NOT NULL DEFAULT 'importado';
-- Remove o default após preencher as linhas existentes
ALTER TABLE "transacoes" ALTER COLUMN "arquivo_origem" DROP DEFAULT;

-- Adiciona categoria_generica (nullable) na tabela transacoes
ALTER TABLE "transacoes" ADD COLUMN "categoria_generica" TEXT;

-- Adiciona sub_categoria (nullable) na tabela regras
ALTER TABLE "regras" ADD COLUMN "sub_categoria" TEXT;
