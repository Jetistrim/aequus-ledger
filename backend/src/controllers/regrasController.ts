import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

/**
 * Estrutura de detalhe de erro por campo para respostas de validação.
 */
interface CampoErroValidacao {
  campo: string;
  mensagem: string;
}

const categoriaSchema = z.enum(['PESSOAL', 'EMPRESA']);

const regraIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido.'),
});

const criarRegraBodySchema = z.object({
  palavraChave: z.string().trim().min(1, 'palavraChave é obrigatória.').max(300, 'palavraChave deve ter no máximo 300 caracteres.'),
  categoria: categoriaSchema,
  subCategoria: z.string().trim().max(120, 'subCategoria deve ter no máximo 120 caracteres.').optional(),
  prioridade: z.number().int().min(0, 'prioridade deve ser maior ou igual a 0.').optional(),
});

const atualizarRegraBodySchema = z
  .object({
    palavraChave: z.string().trim().min(1, 'palavraChave não pode ser vazia.').max(300, 'palavraChave deve ter no máximo 300 caracteres.').optional(),
    categoria: categoriaSchema.optional(),
    subCategoria: z.union([z.string().trim().max(120, 'subCategoria deve ter no máximo 120 caracteres.'), z.null()]).optional(),
    prioridade: z.number().int().min(0, 'prioridade deve ser maior ou igual a 0.').optional(),
  })
  .refine(
    (payload) =>
      payload.palavraChave !== undefined ||
      payload.categoria !== undefined ||
      payload.subCategoria !== undefined ||
      payload.prioridade !== undefined,
    { message: 'Informe ao menos um campo para atualização.' }
  );

/**
 * Converte erros do Zod para o formato canônico de erro por campo da API.
 */
function mapearErrosZod(issues: z.ZodIssue[]): CampoErroValidacao[] {
  return issues.map((issue) => ({
    campo: issue.path.length > 0 ? String(issue.path[0]) : 'payload',
    mensagem: issue.message,
  }));
}

/**
 * Responde uma falha de validação seguindo o contrato padronizado da API.
 */
function responderErroValidacao(
  res: Response,
  mensagem: string,
  issues: z.ZodIssue[]
): void {
  res.status(400).json({
    erro: mensagem,
    codigo: 'VALIDATION_ERROR',
    detalhes: mapearErrosZod(issues),
  });
}

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
    const parsedBody = criarRegraBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      responderErroValidacao(res, 'Payload inválido.', parsedBody.error.issues);
      return;
    }

    const { palavraChave, categoria, subCategoria, prioridade } = parsedBody.data;

    const regra = await prisma.regra.create({
      data: { palavraChave, categoria, subCategoria: subCategoria ?? null, prioridade: prioridade ?? 0 },
    });

    res.status(201).json(regra);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({
        erro: 'Já existe uma regra com os mesmos critérios.',
        codigo: 'RESOURCE_CONFLICT',
      });
      return;
    }

    next(err);
  }
}

export async function atualizarRegra(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedParams = regraIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      responderErroValidacao(res, 'Parâmetros inválidos.', parsedParams.error.issues);
      return;
    }

    const parsedBody = atualizarRegraBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      responderErroValidacao(res, 'Payload inválido.', parsedBody.error.issues);
      return;
    }

    const { id } = parsedParams.data;
    const { palavraChave, categoria, subCategoria, prioridade } = parsedBody.data;

    const regra = await prisma.regra.update({
      where: { id },
      data: { palavraChave, categoria, subCategoria, prioridade },
    });

    res.json(regra);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      res.status(404).json({
        erro: 'Regra não encontrada.',
        codigo: 'RESOURCE_NOT_FOUND',
      });
      return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({
        erro: 'Já existe uma regra com os mesmos critérios.',
        codigo: 'RESOURCE_CONFLICT',
      });
      return;
    }

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
