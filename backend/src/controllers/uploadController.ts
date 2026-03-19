import { Request, Response, NextFunction } from 'express';
import { Tipo } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseFile, TransacaoRaw } from '../services/parserService';
import { gerarHash } from '../services/hashService';
import { classificar } from '../services/classificadorService';

const DB_WRITE_BATCH_SIZE = 40;
const MAX_TOTAL_UPLOAD_SIZE_MB = Number(process.env.MAX_TOTAL_UPLOAD_SIZE_MB || 100);
const MAX_TOTAL_UPLOAD_SIZE_BYTES = MAX_TOTAL_UPLOAD_SIZE_MB * 1024 * 1024;

function validarTamanhoTotalArquivos(arquivos: Express.Multer.File[]) {
  const totalBytes = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0);

  if (totalBytes > MAX_TOTAL_UPLOAD_SIZE_BYTES) {
    const erro = new Error(
      `Os arquivos compatíveis enviados ultrapassam o limite total de ${MAX_TOTAL_UPLOAD_SIZE_MB}MB.`
    ) as Error & { code?: string };
    erro.code = 'LIMIT_TOTAL_FILE_SIZE';
    throw erro;
  }
}

async function criarTransacoesEmLote(
  transacoesRaw: TransacaoRaw[],
  regras: Awaited<ReturnType<typeof prisma.regra.findMany>>
) {
  let importadas = 0;
  let duplicadas = 0;
  const transacoesSalvas: Awaited<ReturnType<typeof prisma.transacao.create>>[] = [];

  for (let i = 0; i < transacoesRaw.length; i += DB_WRITE_BATCH_SIZE) {
    const lote = transacoesRaw.slice(i, i + DB_WRITE_BATCH_SIZE);

    const resultados = await Promise.allSettled(
      lote.map(async (raw) => {
        const hash = gerarHash(raw.dataTransacao, raw.valor, raw.descricao);
        const tipo: Tipo = raw.valor >= 0 ? 'ENTRADA' : 'SAIDA';
        const { classificacao, categoriaGenerica } = classificar(raw.descricao, regras);

        return prisma.transacao.create({
          data: {
            dataTransacao: raw.dataTransacao,
            descricao: raw.descricao,
            valor: Math.abs(raw.valor),
            tipo,
            classificacao,
            categoriaGenerica,
            hashTransacao: hash,
            arquivoOrigem: raw.arquivoOrigem,
          },
        });
      })
    );

    for (const resultado of resultados) {
      if (resultado.status === 'fulfilled') {
        importadas += 1;
        transacoesSalvas.push(resultado.value);
        continue;
      }

      const motivo = resultado.reason as { code?: string };
      if (motivo?.code === 'P2002') {
        duplicadas += 1;
        continue;
      }

      throw resultado.reason;
    }
  }

  return { importadas, duplicadas, transacoesSalvas };
}

export async function uploadArquivo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (arquivos.length === 0) {
      res.status(400).json({ erro: 'Nenhum arquivo enviado. Use o campo "arquivos".' });
      return;
    }

    validarTamanhoTotalArquivos(arquivos);

    const lotePorArquivo = await Promise.all(
      arquivos.map(async (arquivo) => ({ transacoes: await parseFile(arquivo) }))
    );

    const transacoesRaw = lotePorArquivo.flatMap((lote) => lote.transacoes);

    if (transacoesRaw.length === 0) {
      res.status(422).json({ erro: 'Nenhuma transação válida encontrada nos arquivos.' });
      return;
    }

    // Carrega regras uma vez para todo o processamento
    const regras = await prisma.regra.findMany();

    const { importadas, duplicadas, transacoesSalvas } = await criarTransacoesEmLote(transacoesRaw, regras);

    const indefinidas = transacoesSalvas.filter((t) => t.classificacao === 'INDEFINIDO').length;

    res.status(200).json({
      importadas,
      duplicadas,
      indefinidas,
      transacoes: transacoesSalvas,
    });
  } catch (err) {
    next(err);
  }
}
