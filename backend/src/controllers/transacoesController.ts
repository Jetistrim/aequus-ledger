import { Request, Response, NextFunction } from 'express';
import { Classificacao } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { enrichTransacoes } from '../utils/responseHelpers';

export async function listarTransacoes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { classificacao } = req.query;

    const where = classificacao
      ? { classificacao: classificacao as Classificacao }
      : {};

    const transacoes = await prisma.transacao.findMany({
      where,
      orderBy: { dataTransacao: 'desc' },
    });

    res.json(enrichTransacoes(transacoes));
  } catch (err) {
    next(err);
  }
}

export async function atualizarTransacao(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { classificacao, observacao, categoriaGenerica } = req.body as {
      classificacao?: Classificacao;
      observacao?: string;
      categoriaGenerica?: string | null;
    };

    if (!id || typeof id !== 'string') {
      res.status(400).json({ erro: 'ID inválido.' });
      return;
    }

    const dadosAtualizacao: { classificacao?: Classificacao; observacao?: string; categoriaGenerica?: string | null } = {};
    if (classificacao) dadosAtualizacao.classificacao = classificacao;
    if (observacao !== undefined) dadosAtualizacao.observacao = observacao;
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
