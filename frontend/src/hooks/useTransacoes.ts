import { useState, useCallback } from 'react';
import { Transacao, Classificacao } from '../types';
import * as api from '../services/api';

export function useTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await api.listarTransacoes();
      setTransacoes(data);
    } catch {
      setErro('Erro ao carregar transações.');
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
    } catch {
      setErro('Erro ao classificar transação.');
    }
  }, []);

  const atualizarObservacao = useCallback(async (id: string, observacao: string, categoriaGenerica: string | null) => {
    try {
      const atualizada = await api.atualizarTransacao(id, { observacao, categoriaGenerica });
      setTransacoes((prev) =>
        prev.map((t) => (t.id === id ? atualizada : t))
      );
    } catch {
      setErro('Erro ao atualizar observação.');
    }
  }, []);

  return {
    transacoes,
    carregando,
    erro,
    carregar,
    definirTransacoes,
    classificar,
    atualizarObservacao,
  };
}
