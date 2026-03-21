import { useState, useCallback } from 'react';
import { Transacao, Classificacao, PaginacaoTransacoes, TotaisTransacoes } from '../types';
import * as api from '../services/api';

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [paginacao, setPaginacao] = useState<PaginacaoTransacoes>({
    paginaAtual: 1,
    totalPaginas: 1,
    totalRegistros: 0,
    limite: 25,
  });
  const [totais, setTotais] = useState<TotaisTransacoes>({
    pessoal: 0,
    empresa: 0,
    total: 0,
    indefinidos: 0,
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (params?: api.ListarTransacoesParams): Promise<Transacao[] | null> => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await api.listarTransacoes(params);
      setTransacoes(data.dados);
      setPaginacao(data.paginacao);
      setTotais(data.totais);
      return data.dados;
    } catch (err) {
      setErro(api.formatApiErrorMessage(err, 'Erro ao carregar transações.'));
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  const definirTransacoes = useCallback((lista: Transacao[]) => {
    setTransacoes(lista);
  }, []);

  const classificar = useCallback(async (id: string, classificacao: Classificacao) => {
    try {
      const atualizada = await api.atualizarTransacao(id, { classificacao });
      setTransacoes((prev) =>
        prev.map((t) => (t.id === id ? atualizada : t))
      );
    } catch (err) {
      setErro(api.formatApiErrorMessage(err, 'Erro ao classificar transação.'));
    }
  }, []);

  const atualizarIdentificador = useCallback(async (id: string, identificador: string, categoriaGenerica: string | null) => {
    try {
      const atualizada = await api.atualizarTransacao(id, { identificador, categoriaGenerica });
      setTransacoes((prev) =>
        prev.map((t) => (t.id === id ? atualizada : t))
      );
    } catch (err) {
      const apiError = api.toApiRequestError(err, 'Erro ao atualizar identificador.');
      const mensagem = apiError.details[0]?.mensagem || apiError.message;
      setErro(mensagem);
      throw apiError;
    }
  }, []);

  return {
    transacoes,
    paginacao,
    totais,
    carregando,
    erro,
    carregar,
    definirTransacoes,
    classificar,
    atualizarIdentificador,
  };
}
