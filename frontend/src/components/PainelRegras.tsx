import { useState } from 'react';
import { Regra, Categoria } from '../types';
import { useRegras } from '../hooks/useRegras';
import { ModalConfirmacao } from './ModalConfirmacao';
import { ModalTesteRegras } from './ModalTesteRegras';

/**
 * Painel de regras com CRUD, confirmação de exclusão e diagnóstico assistido.
 */
export function PainelRegras() {
  const { regras, carregando, erro: erroApi, criar, atualizar, deletar } = useRegras();
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novaRegra, setNovaRegra] = useState({ palavraChave: '', categoria: 'PESSOAL' as Categoria, subCategoria: '', prioridade: 0 });
  const [editData, setEditData] = useState<Partial<Omit<Regra, 'id'>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [regraParaExcluir, setRegraParaExcluir] = useState<Regra | null>(null);
  const [modalTesteAberto, setModalTesteAberto] = useState(false);

  async function handleCriar() {
    if (!novaRegra.palavraChave.trim()) { setErro('Informe ao menos uma palavra-chave.'); return; }
    setErro(null);
    try {
      await criar(novaRegra);
      setNovaRegra({ palavraChave: '', categoria: 'PESSOAL', subCategoria: '', prioridade: 0 });
    } catch {
      // Erro já tratado no hook com mensagem amigável.
    }
  }

  async function handleAtualizar(id: number) {
    try {
      await atualizar(id, editData);
      setEditandoId(null);
      setEditData({});
    } catch {
      // Mantém edição aberta para o usuário ajustar os campos inválidos.
    }
  }

  function iniciarEdicao(regra: Regra) {
    setEditandoId(regra.id);
    setEditData({ palavraChave: regra.palavraChave, categoria: regra.categoria, subCategoria: regra.subCategoria ?? '', prioridade: regra.prioridade });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-gray-800">Regras de Classificação</h2>
        <button
          onClick={() => setModalTesteAberto(true)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          Abrir Teste de Regras
        </button>
      </div>

      {/* Formulário nova regra */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nova Regra</h3>
        <p className="text-xs text-gray-500 mb-3">Separe múltiplas palavras-chave por vírgula. Ex: IFOOD, RAPPI, UBER</p>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Palavras-chave..."
            value={novaRegra.palavraChave}
            onChange={(e) => setNovaRegra((p) => ({ ...p, palavraChave: e.target.value }))}
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={novaRegra.categoria}
            onChange={(e) => setNovaRegra((p) => ({ ...p, categoria: e.target.value as Categoria }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="PESSOAL">Pessoal</option>
            <option value="EMPRESA">Empresa</option>
          </select>
          <input
            type="text"
            placeholder="Tipo (ex: Alimentação)"
            value={novaRegra.subCategoria}
            onChange={(e) => setNovaRegra((p) => ({ ...p, subCategoria: e.target.value }))}
            className="w-44 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            placeholder="Prioridade"
            value={novaRegra.prioridade}
            min={0}
            onChange={(e) => setNovaRegra((p) => ({ ...p, prioridade: parseInt(e.target.value) || 0 }))}
            className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleCriar}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Adicionar
          </button>
        </div>
        {erro && <p className="text-red-600 text-xs mt-2">{erro}</p>}
        {!erro && erroApi && <p className="text-red-600 text-xs mt-2">{erroApi}</p>}
      </div>

      {/* Tabela de regras */}
      {carregando ? (
        <p className="text-gray-500 text-sm">Carregando regras...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 md:overflow-visible">
          <table className="min-w-[740px] w-full table-fixed divide-y divide-gray-200 text-sm md:min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[36%] px-2 py-3 text-left text-xs font-medium uppercase text-gray-500">Palavras-chave</th>
                <th className="w-[16%] px-2 py-3 text-center text-xs font-medium uppercase text-gray-500">Categoria</th>
                <th className="w-[20%] px-2 py-3 text-center text-xs font-medium uppercase text-gray-500">Tipo</th>
                <th className="w-[12%] px-2 py-3 text-center text-xs font-medium uppercase text-gray-500">Prioridade</th>
                <th className="w-[16%] px-2 py-3 text-center text-xs font-medium uppercase text-gray-500">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {regras.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-2 py-3">
                    {editandoId === r.id ? (
                      <input
                        type="text"
                        value={editData.palavraChave || ''}
                        onChange={(e) => setEditData((p) => ({ ...p, palavraChave: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <span className="block break-words text-gray-700">{r.palavraChave}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {editandoId === r.id ? (
                      <select
                        value={editData.categoria || r.categoria}
                        onChange={(e) => setEditData((p) => ({ ...p, categoria: e.target.value as Categoria }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
                      >
                        <option value="PESSOAL">Pessoal</option>
                        <option value="EMPRESA">Empresa</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        r.categoria === 'PESSOAL' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {r.categoria}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {editandoId === r.id ? (
                      <input
                        type="text"
                        value={editData.subCategoria ?? ''}
                        placeholder="Tipo..."
                        onChange={(e) => setEditData((p) => ({ ...p, subCategoria: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-[130px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    ) : (
                      <span className="block break-words text-xs text-gray-600">{r.subCategoria || '-'}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {editandoId === r.id ? (
                      <input
                        type="number"
                        value={editData.prioridade ?? r.prioridade}
                        min={0}
                        onChange={(e) => setEditData((p) => ({ ...p, prioridade: parseInt(e.target.value) || 0 }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-16 text-center focus:outline-none"
                      />
                    ) : (
                      <span className="text-gray-600">{r.prioridade}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {editandoId === r.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleAtualizar(r.id)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditandoId(null)}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => iniciarEdicao(r)}
                          className="text-gray-400 hover:text-blue-600 transition-colors text-sm"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setRegraParaExcluir(r)}
                          className="text-gray-400 hover:text-red-600 transition-colors text-sm"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {regraParaExcluir && (
        <ModalConfirmacao
          titulo="Confirmar exclusão"
          mensagem={`Tem certeza que quer apagar a regra "${regraParaExcluir.palavraChave}"?`}
          rotuloConfirmar="Apagar linha"
          confirmandoLabel="Apagando..."
          onCancelar={() => setRegraParaExcluir(null)}
          onConfirmar={async () => {
            await deletar(regraParaExcluir.id);
            setRegraParaExcluir(null);
          }}
        />
      )}

      {modalTesteAberto && (
        <ModalTesteRegras
          regraTemporariaInicial={{
            palavraChave: novaRegra.palavraChave,
            categoria: novaRegra.categoria,
            subCategoria: novaRegra.subCategoria,
            prioridade: novaRegra.prioridade,
          }}
          onFechar={() => setModalTesteAberto(false)}
        />
      )}
    </div>
  );
}
