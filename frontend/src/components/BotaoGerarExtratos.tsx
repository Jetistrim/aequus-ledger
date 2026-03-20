import { useState } from 'react';
import * as api from '../services/api';

interface Props {
  totalTransacoes: number;
  indefinidos: number;
  onNovaImportacao: () => void;
}

export function BotaoGerarExtratos({ totalTransacoes, indefinidos, onNovaImportacao }: Props) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleGerar() {
    setGerando(true);
    setErro(null);
    try {
      const { pessoal, empresa } = await api.gerarExtratos();

      // Download automático dos dois arquivos
      for (const url of [pessoal, empresa]) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Pequeno delay para não bloquear o browser
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch {
      setErro('Erro ao gerar extratos. Tente novamente.');
    } finally {
      setGerando(false);
    }
  }

  const semTransacoes = totalTransacoes === 0;
  const desabilitado = semTransacoes || indefinidos > 0 || gerando;

  return (
    <div className="flex flex-col items-end gap-2">
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      <div className="flex gap-3">
        <button
          onClick={onNovaImportacao}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Nova Importação
        </button>
        <div className="relative group">
          <button
            onClick={handleGerar}
            disabled={desabilitado}
            className="px-6 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {gerando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Gerando...
              </>
            ) : '📥 Gerar Extratos'}
          </button>
          {desabilitado && !gerando && (
            <div className="absolute bottom-full right-0 mb-2 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {semTransacoes
                ? 'Nenhuma transação carregada. Faça upload ou carregue dados existentes.'
                : `Classifique todas as ${indefinidos} transação(ões) indefinida(s) antes de gerar.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
