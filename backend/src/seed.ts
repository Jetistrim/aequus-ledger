import fs from 'fs';
import path from 'path';
import type { PrismaClient } from '@prisma/client';

type Categoria = 'PESSOAL' | 'EMPRESA';

interface RegraBase {
  palavraChave: string;
  categoria: Categoria;
  subCategoria?: string | null;
  prioridade: number;
}

interface SeedFile {
  perfil?: string;
  descricao?: string;
  regras: unknown;
}

const SEED_FILE_PATTERN = /^seed-.*\.json$/i;

function criarErroValidacao(mensagem: string, arquivo: string, indice?: number): Error {
  const posicao = typeof indice === 'number' ? ` (regra #${indice + 1})` : '';
  return new Error(`Arquivo ${arquivo}${posicao}: ${mensagem}`);
}

function validarRegra(regra: unknown, arquivo: string, indice: number): RegraBase {
  if (!regra || typeof regra !== 'object') {
    throw criarErroValidacao('regra inválida, esperado objeto.', arquivo, indice);
  }

  const valor = regra as Record<string, unknown>;
  const palavraChave = typeof valor['palavraChave'] === 'string' ? valor['palavraChave'].trim() : '';
  const categoriaRaw = typeof valor['categoria'] === 'string' ? valor['categoria'].trim().toUpperCase() : '';
  const prioridadeRaw = valor['prioridade'];

  if (!palavraChave) {
    throw criarErroValidacao('palavraChave obrigatória.', arquivo, indice);
  }

  if (categoriaRaw !== 'PESSOAL' && categoriaRaw !== 'EMPRESA') {
    throw criarErroValidacao('categoria deve ser PESSOAL ou EMPRESA.', arquivo, indice);
  }

  if (typeof prioridadeRaw !== 'number' || !Number.isInteger(prioridadeRaw) || prioridadeRaw < 0) {
    throw criarErroValidacao('prioridade deve ser inteiro >= 0.', arquivo, indice);
  }

  const subCategoria =
    typeof valor['subCategoria'] === 'string' && valor['subCategoria'].trim()
      ? valor['subCategoria'].trim()
      : null;

  return {
    palavraChave,
    categoria: categoriaRaw,
    subCategoria,
    prioridade: prioridadeRaw,
  };
}

function resolverCaminhosConfig(): string[] {
  const dirEnv = process.env['SEED_CONFIG_DIR'];
  const candidatos = [
    dirEnv ? path.resolve(dirEnv) : null,
    path.resolve(process.cwd(), 'config'),
    path.resolve(process.cwd(), '..', 'config'),
    path.resolve(__dirname, '..', '..', 'config'),
    path.resolve(__dirname, '..', '..', '..', 'config'),
  ].filter((item): item is string => Boolean(item));

  const vistos = new Set<string>();

  for (const pasta of candidatos) {
    if (vistos.has(pasta)) {
      continue;
    }

    vistos.add(pasta);

    if (!fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) {
      continue;
    }

    const encontrados = fs
      .readdirSync(pasta)
      .filter((nome) => SEED_FILE_PATTERN.test(nome))
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      .map((nome) => path.join(pasta, nome));

    if (encontrados.length > 0) {
      return encontrados;
    }
  }

  throw new Error(
    `Nenhum arquivo de seed JSON encontrado com o padrão "seed-*.json" em ${candidatos.join(' | ')}`,
  );
}

export function carregarRegrasDosJson(): RegraBase[] {
  const arquivos = resolverCaminhosConfig();
  const regras: RegraBase[] = [];

  for (const arquivo of arquivos) {
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const parseado = JSON.parse(conteudo) as SeedFile;
    const nomeArquivo = path.basename(arquivo);

    if (!parseado || typeof parseado !== 'object' || !Array.isArray(parseado.regras)) {
      throw criarErroValidacao('campo "regras" deve ser um array.', nomeArquivo);
    }

    parseado.regras.forEach((regra, indice) => {
      regras.push(validarRegra(regra, nomeArquivo, indice));
    });
  }

  return regras;
}

export async function seedRegras(prismaClient: PrismaClient, regras: RegraBase[]): Promise<void> {
  for (const regra of regras) {
    await prismaClient.regra.upsert({
      where: {
        palavraChave_categoria_prioridade: {
          palavraChave: regra.palavraChave,
          categoria: regra.categoria,
          prioridade: regra.prioridade,
        },
      },
      update: {},
      create: {
        palavraChave: regra.palavraChave,
        categoria: regra.categoria,
        subCategoria: regra.subCategoria ?? null,
        prioridade: regra.prioridade,
      },
    });
  }
}

function getPrismaClient(): PrismaClient {
  const { prisma } = require('./lib/prisma') as { prisma: PrismaClient };
  return prisma;
}

export async function runSeed(prismaClient?: PrismaClient): Promise<void> {
  const client = prismaClient ?? getPrismaClient();
  const regras = carregarRegrasDosJson();
  await seedRegras(client, regras);
  console.log(`Seed de regras concluido com sucesso. Regras lidas: ${regras.length}.`);
}

if (require.main === module) {
  const prisma = getPrismaClient();

  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
