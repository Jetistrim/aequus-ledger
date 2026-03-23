import { Request, Response, NextFunction } from 'express';
import { Tipo } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseFile, TransacaoRaw } from '../services/parserService';
import { gerarChaveBaseTransacao, gerarCodigoReferencia, gerarHash } from '../services/hashService';
import { classificar } from '../services/classificadorService';
import { enrichTransacoes } from '../utils/responseHelpers';
import { sanitizeTextInput } from '../utils/normalization';

const DB_WRITE_BATCH_SIZE = 40;

async function criarTransacoesEmLote(
  transacoesRaw: TransacaoRaw[],
  regras: Awaited<ReturnType<typeof prisma.regra.findMany>>,
  identificadoresPorArquivo: Record<string, string> = {}
) {
  let importadas = 0;
  let duplicadas = 0;
  const transacoesSalvas: Awaited<ReturnType<typeof prisma.transacao.create>>[] = [];
  const ocorrenciasPorChave = new Map<string, number>();

  for (let i = 0; i < transacoesRaw.length; i += DB_WRITE_BATCH_SIZE) {
    const lote = transacoesRaw.slice(i, i + DB_WRITE_BATCH_SIZE);

    const resultados = await Promise.allSettled(
      lote.map(async (raw) => {
        const chaveBase = gerarChaveBaseTransacao(raw.dataTransacao, raw.valor, raw.descricao);
        const indiceOcorrencia = ocorrenciasPorChave.get(chaveBase) ?? 0;
        ocorrenciasPorChave.set(chaveBase, indiceOcorrencia + 1);

        const hash = gerarHash(raw.dataTransacao, raw.valor, raw.descricao, indiceOcorrencia);
        const codigoReferencia = gerarCodigoReferencia(
          raw.dataTransacao,
          raw.valor,
          raw.descricao,
          indiceOcorrencia,
        );
        const tipo: Tipo = raw.valor >= 0 ? 'ENTRADA' : 'SAIDA';
        const { classificacao, categoriaGenerica } = classificar(
          raw.descricao,
          regras,
          raw.dataTransacao,
          Math.abs(raw.valor),
          tipo === 'ENTRADA' ? 'entrada' : 'saida',
        );
        const identificador = identificadoresPorArquivo[raw.arquivoOrigem] || '';

        return prisma.transacao.create({
          data: {
            dataTransacao: raw.dataTransacao,
            descricao: raw.descricao,
            valor: Math.abs(raw.valor),
            tipo,
            classificacao,
            categoriaGenerica,
            hashTransacao: hash,
            codigoReferencia,
            arquivoOrigem: raw.arquivoOrigem,
            identificador,
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

    // Parseia e sanitiza identificadores (filename → label)
    const identificadores: Record<string, string> = {};
    const identificadoresJson = req.body?.identificadoresJson as string | undefined;
    if (identificadoresJson) {
      try {
        const parsed: unknown = JSON.parse(identificadoresJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof val === 'string') {
              identificadores[String(key)] = sanitizeTextInput(val).slice(0, 100);
            }
          }
        }
      } catch {
        // JSON mal-formado — ignora silenciosamente
      }
    }

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

    const { importadas, duplicadas, transacoesSalvas } = await criarTransacoesEmLote(
      transacoesRaw,
      regras,
      identificadores
    );

    const indefinidas = transacoesSalvas.filter((t) => t.classificacao === 'INDEFINIDO').length;

    res.status(200).json({
      importadas,
      duplicadas,
      indefinidas,
      transacoes: enrichTransacoes(transacoesSalvas),
    });
  } catch (err) {
    next(err);
  }
}
