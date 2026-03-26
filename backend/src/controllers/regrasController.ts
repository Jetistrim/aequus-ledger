import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sanitizeTextInput } from '../utils/normalization';
import { diagnosticarRegras, ModoTesteRegras } from '../services/regrasDiagnosticoService';
import { Regra as RegraClassificador } from '../services/classificadorService';

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

const modoRegrasSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['SALVAS', 'TEMPORARIAS', 'AMBAS'])
);

const filtroClassificacaoBancoSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['TODAS', 'INDEFINIDO', 'PESSOAL', 'EMPRESA'])
);

const regraTemporariaSchema = z.object({
  palavraChave: z.string().trim().min(1, 'palavraChave é obrigatória.').max(300, 'palavraChave deve ter no máximo 300 caracteres.'),
  categoria: categoriaSchema,
  subCategoria: z.string().trim().max(120, 'subCategoria deve ter no máximo 120 caracteres.').optional(),
  prioridade: z.number().int().min(0, 'prioridade deve ser maior ou igual a 0.').optional(),
});

const amostraManualSchema = z.object({
  descricao: z.string().trim().min(1, 'descricao é obrigatória.').max(500, 'descricao deve ter no máximo 500 caracteres.'),
  valor: z.number().nonnegative('valor deve ser maior ou igual a 0.').max(999999.99, 'valor deve ser menor que 1.000.000.'),
  tipo: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(['ENTRADA', 'SAIDA'])
  ).default('SAIDA'),
  dataTransacao: z.coerce.date().optional(),
});

const testarRegrasBodySchema = z
  .object({
    modoRegras: modoRegrasSchemaWithDefault(),
    regrasTemporarias: z.array(regraTemporariaSchema).max(80, 'Máximo de 80 regras temporárias por teste.').optional(),
    usarIndefinidasBanco: z.boolean().optional(),
    filtroClassificacaoBanco: filtroClassificacaoBancoSchema.default('TODAS'),
    limiteAmostras: z.number().int().min(1, 'limiteAmostras deve ser maior ou igual a 1.').max(500, 'limiteAmostras deve ser no máximo 500.').optional(),
    amostrasManuais: z.array(amostraManualSchema).max(300, 'Máximo de 300 amostras manuais por teste.').optional(),
  })
  .refine(
    (payload) => payload.usarIndefinidasBanco !== false || (payload.amostrasManuais?.length ?? 0) > 0,
    { message: 'Informe amostras manuais quando usarIndefinidasBanco for false.' }
  );

function modoRegrasSchemaWithDefault(): z.ZodDefault<typeof modoRegrasSchema> {
  return modoRegrasSchema.default('SALVAS');
}

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

/**
 * Executa um diagnostico de regras para apoiar o ajuste fino das classificacoes.
 *
 * O endpoint apenas calcula simulacoes e agregacoes, sem alterar dados no banco.
 */
export async function testarRegras(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsedBody = testarRegrasBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      responderErroValidacao(res, 'Payload inválido.', parsedBody.error.issues);
      return;
    }

    const {
      modoRegras,
      regrasTemporarias = [],
      usarIndefinidasBanco = true,
      filtroClassificacaoBanco,
      limiteAmostras = 200,
      amostrasManuais = [],
    } = parsedBody.data;

    const precisaRegrasSalvas = modoRegras !== 'TEMPORARIAS';
    const regrasSalvasRaw = precisaRegrasSalvas
      ? await prisma.regra.findMany({ orderBy: { prioridade: 'asc' } })
      : [];

    const regrasSalvas: RegraClassificador[] = regrasSalvasRaw.map((regra) => ({
      palavraChave: regra.palavraChave,
      categoria: regra.categoria,
      subCategoria: regra.subCategoria,
      prioridade: regra.prioridade,
    }));

    const regrasTemporariasNormalizadas: RegraClassificador[] = regrasTemporarias.map((regra) => ({
      palavraChave: sanitizeTextInput(regra.palavraChave),
      categoria: regra.categoria,
      subCategoria: regra.subCategoria ? sanitizeTextInput(regra.subCategoria) : null,
      prioridade: regra.prioridade ?? 0,
    }));

    const whereClassificacao = filtroClassificacaoBanco === 'TODAS'
      ? undefined
      : filtroClassificacaoBanco;

    const amostrasBanco = usarIndefinidasBanco
      ? await prisma.transacao.findMany({
          where: whereClassificacao ? { classificacao: whereClassificacao } : undefined,
          orderBy: { dataTransacao: 'desc' },
          take: limiteAmostras,
          select: {
            descricao: true,
            valor: true,
            tipo: true,
            dataTransacao: true,
            classificacao: true,
          },
        })
      : [];

    const amostras = [
      ...amostrasBanco.map((item) => ({
        descricao: item.descricao,
        valor: Number(item.valor),
        tipo: item.tipo,
        dataTransacao: item.dataTransacao,
        classificacaoOriginal: item.classificacao,
      })),
      ...amostrasManuais.map((item) => ({
        descricao: item.descricao,
        valor: item.valor,
        tipo: item.tipo,
        dataTransacao: item.dataTransacao,
        classificacaoOriginal: 'INDEFINIDO' as const,
      })),
    ];

    const origemAmostras = amostrasBanco.length > 0 && amostrasManuais.length > 0
      ? 'MISTO'
      : amostrasBanco.length > 0
        ? 'BANCO_INDEFINIDAS'
        : 'MANUAL';

    const diagnostico = diagnosticarRegras(
      amostras,
      modoRegras as ModoTesteRegras,
      regrasSalvas,
      regrasTemporariasNormalizadas,
      origemAmostras,
    );

    res.json(diagnostico);
  } catch (err) {
    next(err);
  }
}
