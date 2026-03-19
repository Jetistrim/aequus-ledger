import axios from 'axios';
import { Classificacao, Regra, RespostaUpload, Transacao } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export async function uploadArquivo(file: File): Promise<RespostaUpload> {
  return uploadArquivos([file]);
}

export async function uploadArquivos(files: File[]): Promise<RespostaUpload> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('arquivos', file);
  }

  const { data } = await api.post<RespostaUpload>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

export async function listarTransacoes(): Promise<Transacao[]> {
  const { data } = await api.get<Transacao[]>('/transacoes');
  return data;
}

export async function atualizarTransacao(
  id: string,
  payload: { classificacao?: Classificacao; observacao?: string; categoriaGenerica?: string | null }
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
  const { data } = await api.post<Regra>('/regras', regra);
  return data;
}

export async function atualizarRegra(
  id: number,
  regra: Partial<Omit<Regra, 'id'>>
): Promise<Regra> {
  const { data } = await api.put<Regra>(`/regras/${id}`, regra);
  return data;
}

export async function deletarRegra(id: number): Promise<void> {
  await api.delete(`/regras/${id}`);
}

export async function gerarExtratos(): Promise<{ pessoal: string; empresa: string }> {
  const { data } = await api.post<{ pessoal: string; empresa: string }>('/export');
  return data;
}
