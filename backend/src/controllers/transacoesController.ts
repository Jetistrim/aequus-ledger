import { Request, Response, NextFunction } from 'express';
import { Classificacao, Prisma, Tipo } from '@prisma/client';
import { z } from 'zod';
import { prisma, isSqlite } from '../lib/prisma';
import { enrichTransacoes } from '../utils/responseHelpers';

const classificacaoSchema = z.enum(['PESSOAL', 'EMPRESA', 'INDEFINIDO']);

const idParamSchema = z.object({
  id: z.string().uuid('ID inválido.'),
});

const atualizarTransacaoBodySchema = z
  .object({
    classificacao: classificacaoSchema.optional(),
    identificador: z.string().trim().max(100, 'Identificador deve ter no máximo 100 caracteres.').optional(),
    categoriaGenerica: z
      .union([z.string().trim().max(120, 'Categoria genérica deve ter no máximo 120 caracteres.'), z.null()])
      .optional(),
  })
  .refine(
    (payload) =>
      payload.classificacao !== undefined ||
      payload.identificador !== undefined ||
      payload.categoriaGenerica !== undefined,
    { message: 'Informe ao menos um campo para atualização.' }
  );

export async function listarTransacoes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paginaQuery = Number(req.query.pagina ?? 1);
    const limiteQuery = Number(req.query.limite ?? 25);
    const pagina = Number.isFinite(paginaQuery) && paginaQuery > 0 ? Math.floor(paginaQuery) : 1;
    const limite = Number.isFinite(limiteQuery)
      ? Math.min(100, Math.max(1, Math.floor(limiteQuery)))
      : 25;

    const classificacoesValidas: Classificacao[] = ['PESSOAL', 'EMPRESA', 'INDEFINIDO'];
    const tiposValidos: Tipo[] = ['ENTRADA', 'SAIDA'];

    const classificacaoQuery = String(req.query.classificacao ?? '').toUpperCase();
    const tipoQuery = String(req.query.tipo ?? '').toUpperCase();
    const busca = String(req.query.busca ?? '').trim();

    const classificacao = classificacoesValidas.includes(classificacaoQuery as Classificacao)
      ? (classificacaoQuery as Classificacao)
      : undefined;
    const tipo = tiposValidos.includes(tipoQuery as Tipo)
      ? (tipoQuery as Tipo)
      : undefined;

    const where: Prisma.TransacaoWhereInput = {};
    if (classificacao) {
      where.classificacao = classificacao;
    }
    if (tipo) {
      where.tipo = tipo;
    }
    if (busca) {
      // mode 'insensitive' só é suportado pelo PostgreSQL, não pelo SQLite
      const stringFilter = (value: string): Prisma.StringFilter =>
        isSqlite
          ? { contains: value }
          : { contains: value, mode: 'insensitive' };

      const nullableFilter = (value: string): Prisma.StringNullableFilter =>
        isSqlite
          ? { contains: value }
          : { contains: value, mode: 'insensitive' };

      where.OR = [
        { descricao: stringFilter(busca) },
        { identificador: stringFilter(busca) },
        { categoriaGenerica: nullableFilter(busca) },
        { arquivoOrigem: stringFilter(busca) },
      ];
    }

    const totalRegistros = await prisma.transacao.count({ where });
    const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));
    const paginaAtual = Math.min(pagina, totalPaginas);
    const skip = (paginaAtual - 1) * limite;

    const transacoes = await prisma.transacao.findMany({
      where,
      orderBy: { dataTransacao: 'desc' },
      skip,
      take: limite,
    });

    const [somaPessoal, somaEmpresa, totalIndefinidos] = await Promise.all([
      prisma.transacao.aggregate({
        where: { classificacao: 'PESSOAL' },
        _sum: { valor: true },
      }),
      prisma.transacao.aggregate({
        where: { classificacao: 'EMPRESA' },
        _sum: { valor: true },
      }),
      prisma.transacao.count({ where: { classificacao: 'INDEFINIDO' } }),
    ]);

    const pessoal = Number(somaPessoal._sum.valor ?? 0);
    const empresa = Number(somaEmpresa._sum.valor ?? 0);

    res.json({
      dados: enrichTransacoes(transacoes),
      paginacao: {
        paginaAtual,
        totalPaginas,
        totalRegistros,
        limite,
      },
      totais: {
        pessoal,
        empresa,
        total: pessoal + empresa,
        indefinidos: totalIndefinidos,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function atualizarTransacao(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ erro: parsedParams.error.issues[0]?.message ?? 'ID inválido.' });
      return;
    }

    const parsedBody = atualizarTransacaoBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ erro: parsedBody.error.issues[0]?.message ?? 'Payload inválido.' });
      return;
    }

    const { id } = parsedParams.data;
    const { classificacao, identificador, categoriaGenerica } = parsedBody.data;

    const dadosAtualizacao: { classificacao?: Classificacao; identificador?: string; categoriaGenerica?: string | null } = {};
    if (classificacao) dadosAtualizacao.classificacao = classificacao;
    if (identificador !== undefined) dadosAtualizacao.identificador = identificador;
    if (categoriaGenerica !== undefined) dadosAtualizacao.categoriaGenerica = categoriaGenerica;

    const transacao = await prisma.transacao.update({
      where: { id },
      data: dadosAtualizacao,
    });

    res.json(transacao);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ erro: 'Transação não encontrada.' });
      return;
    }

    next(err);
  }
}

export async function deletarTransacao(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = idParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      res.status(400).json({ erro: parsedParams.error.issues[0]?.message ?? 'ID inválido.' });
      return;
    }

    await prisma.transacao.delete({
      where: { id: parsedParams.data.id },
    });

    res.status(204).send();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({ erro: 'Transação não encontrada.' });
      return;
    }

    next(err);
  }
}

export async function deletarTodasTransacoes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.transacao.deleteMany({});

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
