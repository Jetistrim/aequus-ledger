import axios from 'axios';
import {
  AmostraManualDiagnostico,
  Classificacao,
  FormatoExportacao,
  ModoTesteRegras,
  Regra,
  RegraTemporariaTeste,
  RespostaTesteRegras,
  RespostaListagemTransacoes,
  RespostaUpload,
  Transacao,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface SessaoAuth {
  autenticado: boolean;
  usuario?: string;
  autenticacaoHabilitada?: boolean;
}

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

export async function loginSistema(usuario: string, senha: string): Promise<SessaoAuth> {
  const { data } = await api.post<SessaoAuth>('/auth/login', { usuario, senha });
  return data;
}

export async function verificarSessao(): Promise<SessaoAuth> {
  try {
    const { data } = await api.get<SessaoAuth>('/auth/me');
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return { autenticado: false };
    }
    throw error;
  }
}

export async function logoutSistema(): Promise<void> {
  await api.post('/auth/logout');
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

/**
 * Payload aceito pela API para atualização parcial de uma transação.
 */
export interface AtualizacaoTransacaoPayload {
  classificacao?: Classificacao;
  identificador?: string;
  categoriaGenerica?: string | null;
}

export async function listarTransacoes(params?: ListarTransacoesParams): Promise<RespostaListagemTransacoes> {
  const { data } = await api.get<RespostaListagemTransacoes>('/transacoes', { params });
  return data;
}

export async function atualizarTransacao(
  id: string,
  payload: AtualizacaoTransacaoPayload
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

/**
 * Executa simulacao de classificacao para apoiar o ajuste fino de regras.
 */
export async function testarRegras(payload: {
  modoRegras: ModoTesteRegras;
  regrasTemporarias?: RegraTemporariaTeste[];
  usarIndefinidasBanco?: boolean;
  filtroClassificacaoBanco?: 'TODAS' | 'INDEFINIDO' | 'PESSOAL' | 'EMPRESA';
  limiteAmostras?: number;
  amostrasManuais?: AmostraManualDiagnostico[];
}): Promise<RespostaTesteRegras> {
  try {
    const { data } = await api.post<RespostaTesteRegras>('/regras/teste', payload);
    return data;
  } catch (error) {
    throw parseApiError(error, 'Erro ao executar teste de regras.');
  }
}

export interface RespostaExportacao {
  formato: FormatoExportacao;
  pessoal: string;
  empresa: string;
}

export async function gerarExtratos(formato: FormatoExportacao): Promise<RespostaExportacao> {
  const { data } = await api.post<RespostaExportacao>('/export', { formato });
  return data;
}
