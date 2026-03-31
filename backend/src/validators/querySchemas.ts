import path from 'path';
import { z } from 'zod';

const classificacaoQuerySchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(['PESSOAL', 'EMPRESA', 'INDEFINIDO']).optional()
  )
  .catch(undefined);

const tipoQuerySchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(['ENTRADA', 'SAIDA']).optional()
  )
  .catch(undefined);

const buscaQuerySchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.trim() : undefined),
    z.string().max(120, 'Busca deve ter no máximo 120 caracteres.').optional()
  )
  .catch(undefined);

export const listarTransacoesQuerySchema = z.object({
  pagina: z.coerce.number().int().positive().catch(1),
  limite: z.coerce.number().int().positive().max(50).catch(50),
  classificacao: classificacaoQuerySchema,
  tipo: tipoQuerySchema,
  busca: buscaQuerySchema,
});

export const downloadArquivoQuerySchema = z.object({
  file: z
    .string()
    .trim()
    .min(1, 'Nome de arquivo inválido.')
    .max(255, 'Nome de arquivo inválido.')
    .refine((value) => path.basename(value) === value, 'Nome de arquivo inválido.'),
});
