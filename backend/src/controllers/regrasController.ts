import { Request, Response, NextFunction } from 'express';
import { Categoria } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function listarRegras(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const regras = await prisma.regra.findMany({ orderBy: { prioridade: 'asc' } });
    res.json(regras);
  } catch (err) {
    next(err);
  }
}

export async function criarRegra(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { palavraChave, categoria, subCategoria, prioridade } = req.body as {
      palavraChave: string;
      categoria: Categoria;
      subCategoria?: string;
      prioridade: number;
    };

    if (!palavraChave || !categoria) {
      res.status(400).json({ erro: 'palavraChave e categoria são obrigatórios.' });
      return;
    }

    const regra = await prisma.regra.create({
      data: { palavraChave, categoria, subCategoria: subCategoria ?? null, prioridade: prioridade ?? 0 },
    });

    res.status(201).json(regra);
  } catch (err) {
    next(err);
  }
}

export async function atualizarRegra(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ erro: 'ID inválido.' }); return; }

    const { palavraChave, categoria, subCategoria, prioridade } = req.body as {
      palavraChave?: string;
      categoria?: Categoria;
      subCategoria?: string | null;
      prioridade?: number;
    };

    const regra = await prisma.regra.update({
      where: { id },
      data: { palavraChave, categoria, subCategoria, prioridade },
    });

    res.json(regra);
  } catch (err) {
    next(err);
  }
}

export async function deletarRegra(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ erro: 'ID inválido.' }); return; }

    await prisma.regra.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
