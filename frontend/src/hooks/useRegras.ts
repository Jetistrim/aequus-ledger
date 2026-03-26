import { useState, useCallback, useEffect } from 'react';
import { Regra } from '../types';
import * as api from '../services/api';

/**
 * Hook de estado/CRUD para a página de regras de classificação.
 */
export function useRegras() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Carrega regras ordenadas a partir da API e atualiza o estado local. */
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await api.listarRegras();
      setRegras(data);
    } catch (err) {
      setErro(api.formatApiErrorMessage(err, 'Erro ao carregar regras.'));
    } finally {
      setCarregando(false);
    }
  }, []);

  /** Cria regra e mantém ordenação local por prioridade. */
  const criar = useCallback(async (regra: Omit<Regra, 'id'>) => {
    try {
      setErro(null);
      const nova = await api.criarRegra(regra);
      setRegras((prev) => [...prev, nova].sort((a, b) => a.prioridade - b.prioridade));
    } catch (err) {
      const mensagem = api.formatApiErrorMessage(err, 'Erro ao criar regra.');
      setErro(mensagem);
      throw err;
    }
  }, []);

  /** Atualiza uma regra existente pelo id sem recarregar a lista completa. */
  const atualizar = useCallback(async (id: number, dados: Partial<Omit<Regra, 'id'>>) => {
    try {
      setErro(null);
      const atualizada = await api.atualizarRegra(id, dados);
      setRegras((prev) => prev.map((r) => (r.id === id ? atualizada : r)));
    } catch (err) {
      const mensagem = api.formatApiErrorMessage(err, 'Erro ao atualizar regra.');
      setErro(mensagem);
      throw err;
    }
  }, []);

  /** Exclui regra e remove o item do estado local. */
  const deletar = useCallback(async (id: number) => {
    try {
      setErro(null);
      await api.deletarRegra(id);
      setRegras((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setErro(api.formatApiErrorMessage(err, 'Erro ao excluir regra.'));
      throw err;
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return { regras, carregando, erro, carregar, criar, atualizar, deletar };
}
