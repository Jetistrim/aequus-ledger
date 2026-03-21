import axios from 'axios';
import { Classificacao, Regra, RespostaListagemTransacoes, RespostaUpload, Transacao } from '../types';

const api = axios.create({
  baseURL: '/api',
});

/**
 * Detalhe de erro vinculado a um campo específico retornado pela API.
 */
export interface ApiErrorDetail {
  campo: string;
  mensagem: string;
}

/**
 * Contrato de erro padrão exposto pelos endpoints da API.
 */
export interface ApiErrorResponse {
  erro?: string;
  codigo?: string;
  detalhes?: ApiErrorDetail[];
}

/**
 * Erro normalizado para consumo no frontend, preservando código e detalhes por campo.
 */
export class ApiRequestError extends Error {
  code?: string;
  details: ApiErrorDetail[];

  constructor(message: string, code?: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Converte diferentes formatos de falha HTTP para uma instância consistente de ApiRequestError.
 */
function parseApiError(error: unknown, fallbackMessage: string): ApiRequestError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const payload = error.response?.data;
    const message = payload?.erro || fallbackMessage;
    const details = Array.isArray(payload?.detalhes) ? payload.detalhes : [];
    return new ApiRequestError(message, payload?.codigo, details);
  }

  return new ApiRequestError(fallbackMessage);
}

/**
 * Extrai uma mensagem amigável priorizando o primeiro detalhe de campo quando disponível.
 */
export function formatApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const apiError = parseApiError(error, fallbackMessage);
  const firstFieldError = apiError.details[0]?.mensagem;

  return firstFieldError || apiError.message;
}

/**
 * Normaliza a falha para ApiRequestError sem perder metadados do backend.
 */
export function toApiRequestError(error: unknown, fallbackMessage: string): ApiRequestError {
  return parseApiError(error, fallbackMessage);
}

export async function uploadArquivo(file: File): Promise<RespostaUpload> {
  return uploadArquivos([file]);
}

export async function uploadArquivos(
  files: File[],
  identificadores: Record<string, string> = {}
): Promise<RespostaUpload> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('arquivos', file);
  }
  if (Object.keys(identificadores).length > 0) {
    formData.append('identificadoresJson', JSON.stringify(identificadores));
  }

  const { data } = await api.post<RespostaUpload>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export interface ListarTransacoesParams {
  pagina?: number;
  limite?: number;
  classificacao?: 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
  tipo?: 'ENTRADA' | 'SAIDA';
  busca?: string;
}

export async function listarTransacoes(params?: ListarTransacoesParams): Promise<RespostaListagemTransacoes> {
  const { data } = await api.get<RespostaListagemTransacoes>('/transacoes', { params });
  return data;
}

export async function atualizarTransacao(
  id: string,
  payload: { classificacao?: Classificacao; identificador?: string; categoriaGenerica?: string | null }
): Promise<Transacao> {
  const { data } = await api.patch<Transacao>(`/transacoes/${id}`, payload);
  return data;
}

export async function listarRegras(): Promise<Regra[]> {
  const { data } = await api.get<Regra[]>('/regras');
  return data;
}

export async function criarRegra(
  regra: Omit<Regra, 'id'>
): Promise<Regra> {
  try {
    const { data } = await api.post<Regra>('/regras', regra);
    return data;
  } catch (error) {
    throw parseApiError(error, 'Erro ao criar regra.');
  }
}

export async function atualizarRegra(
  id: number,
  regra: Partial<Omit<Regra, 'id'>>
): Promise<Regra> {
  try {
    const { data } = await api.put<Regra>(`/regras/${id}`, regra);
    return data;
  } catch (error) {
    throw parseApiError(error, 'Erro ao atualizar regra.');
  }
}

export async function deletarRegra(id: number): Promise<void> {
  await api.delete(`/regras/${id}`);
}

export async function gerarExtratos(): Promise<{ pessoal: string; empresa: string }> {
  const { data } = await api.post<{ pessoal: string; empresa: string }>('/export');
  return data;
}
