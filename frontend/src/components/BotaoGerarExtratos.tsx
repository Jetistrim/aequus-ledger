import { useState } from 'react';
import { FormatoExportacao } from '../types';
import * as api from '../services/api';

interface Props {
  totalTransacoes: number;
  indefinidos: number;
  onNovaImportacao: () => void;
}

const LABELS_FORMATO: Record<FormatoExportacao, string> = {
  xlsx: 'XLSX bonito',
  csv: 'CSV compatível',
};

export function BotaoGerarExtratos({ totalTransacoes, indefinidos, onNovaImportacao }: Props) {
  const [gerandoFormato, setGerandoFormato] = useState<FormatoExportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function baixarArquivos(urls: string[]) {
    for (const url of urls) {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async function handleGerar(formato: FormatoExportacao) {
    setGerandoFormato(formato);
    setErro(null);
    try {
      const { pessoal, empresa } = await api.gerarExtratos(formato);
      await baixarArquivos([pessoal, empresa]);
    } catch {
      setErro(`Erro ao gerar extratos em ${LABELS_FORMATO[formato]}. Tente novamente.`);
    } finally {
      setGerandoFormato(null);
    }
  }

  const semTransacoes = totalTransacoes === 0;
  const desabilitado = semTransacoes || indefinidos > 0 || gerandoFormato !== null;

  return (
    <div className="flex flex-col items-end gap-2">
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          onClick={onNovaImportacao}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Nova Importação
        </button>
        <div className="relative group">
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => handleGerar('xlsx')}
              disabled={desabilitado}
              className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {gerandoFormato === 'xlsx' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Gerando XLSX...
                </>
              ) : '📊 Exportar XLSX'}
            </button>
            <button
              onClick={() => handleGerar('csv')}
              disabled={desabilitado}
              className="px-5 py-2 rounded-lg text-sm font-semibold border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {gerandoFormato === 'csv' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Gerando CSV...
                </>
              ) : 'Exportar CSV'}
            </button>
          </div>
          {desabilitado && !gerandoFormato && (
            <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {semTransacoes
                ? 'Nenhuma transação carregada. Faça upload ou carregue dados existentes.'
                : `Classifique todas as ${indefinidos} transação(ões) indefinida(s) antes de exportar.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
