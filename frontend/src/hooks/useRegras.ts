import { useState, useCallback, useEffect } from 'react';
import { Regra } from '../types';
import * as api from '../services/api';

export function useRegras() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await api.listarRegras();
      setRegras(data);
    } catch {
      setErro('Erro ao carregar regras.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const criar = useCallback(async (regra: Omit<Regra, 'id'>) => {
    const nova = await api.criarRegra(regra);
    setRegras((prev) => [...prev, nova].sort((a, b) => a.prioridade - b.prioridade));
  }, []);

  const atualizar = useCallback(async (id: number, dados: Partial<Omit<Regra, 'id'>>) => {
    const atualizada = await api.atualizarRegra(id, dados);
    setRegras((prev) => prev.map((r) => (r.id === id ? atualizada : r)));
  }, []);

  const deletar = useCallback(async (id: number) => {
    await api.deletarRegra(id);
    setRegras((prev) => prev.filter((r) => r.id !== id));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return { regras, carregando, erro, carregar, criar, atualizar, deletar };
}
