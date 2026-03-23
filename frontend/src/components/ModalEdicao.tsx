import { useState } from 'react';
import { Transacao } from '../types';
import { ApiRequestError, AtualizacaoTransacaoPayload } from '../services/api';

interface Props {
  transacao: Transacao;
  onFechar: () => void;
  onSalvar: (id: string, payload: AtualizacaoTransacaoPayload) => Promise<void>;
}

/**
 * Modal de edição completa da linha, incluindo reclassificação manual.
 */
export function ModalEdicao({ transacao, onFechar, onSalvar }: Props) {
  const [classificacao, setClassificacao] = useState(transacao.classificacao);
  const [identificador, setIdentificador] = useState(transacao.identificador || '');
  const [categoriaGenerica, setCategoriaGenerica] = useState(transacao.categoriaGenerica || '');
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [erroClassificacao, setErroClassificacao] = useState<string | null>(null);
  const [erroIdentificador, setErroIdentificador] = useState<string | null>(null);
  const [erroCategoria, setErroCategoria] = useState<string | null>(null);

  async function handleSalvar() {
    setSalvando(true);
    setErroGeral(null);
    setErroClassificacao(null);
    setErroIdentificador(null);
    setErroCategoria(null);

    try {
      await onSalvar(transacao.id, {
        classificacao,
        identificador,
        categoriaGenerica: categoriaGenerica || null,
      });
      onFechar();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setErroGeral(err.message);

        for (const detalhe of err.details) {
          if (detalhe.campo === 'classificacao') {
            setErroClassificacao(detalhe.mensagem);
          }
          if (detalhe.campo === 'identificador') {
            setErroIdentificador(detalhe.mensagem);
          }
          if (detalhe.campo === 'categoriaGenerica') {
            setErroCategoria(detalhe.mensagem);
          }
        }
      } else {
        setErroGeral('Não foi possível salvar a transação.');
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Editar Transação</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-500">Descrição</p>
          <p className="font-medium text-gray-800">{transacao.descricao}</p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">Data</p>
          <p className="font-medium text-gray-800">
            {new Date(transacao.dataTransacao).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">Valor</p>
          <p className="font-medium text-gray-800">
            {Number(transacao.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Classificação</label>
          <select
            value={classificacao}
            onChange={(e) => setClassificacao(e.target.value as Transacao['classificacao'])}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="PESSOAL">Pessoal</option>
            <option value="EMPRESA">Empresa</option>
            <option value="INDEFINIDO">Indefinido</option>
          </select>
          {erroClassificacao && <p className="mt-1 text-xs text-red-600">{erroClassificacao}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">Tipo de despesa</label>
          <input
            type="text"
            value={categoriaGenerica}
            onChange={(e) => setCategoriaGenerica(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex: Alimentação, Transporte, Imposto..."
            maxLength={120}
          />
          {erroCategoria && <p className="mt-1 text-xs text-red-600">{erroCategoria}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-500 mb-1">Identificador</label>
          <input
            type="text"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            maxLength={100}
            placeholder="Ex: Santander do Gabriel"
          />
          {erroIdentificador && <p className="mt-1 text-xs text-red-600">{erroIdentificador}</p>}
        </div>

        {erroGeral && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erroGeral}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onFechar}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
