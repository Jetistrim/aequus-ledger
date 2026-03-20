import { Request, Response, NextFunction } from 'express';
import { Classificacao, Prisma, Tipo } from '@prisma/client';
import { prisma, isSqlite } from '../lib/prisma';
import { enrichTransacoes } from '../utils/responseHelpers';

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
    const { id } = req.params;
    const { classificacao, identificador, categoriaGenerica } = req.body as {
      classificacao?: Classificacao;
      identificador?: string;
      categoriaGenerica?: string | null;
    };

    if (!id || typeof id !== 'string') {
      res.status(400).json({ erro: 'ID inválido.' });
      return;
    }

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
    next(err);
  }
}
