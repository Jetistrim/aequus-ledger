import { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { TotalizadoresBar } from '../components/TotalizadoresBar';
import { FiltroRapido } from '../components/FiltroRapido';
import { TabelaConciliacao } from '../components/TabelaConciliacao';
import { BotaoGerarExtratos } from '../components/BotaoGerarExtratos';
import { useTransacoes } from '../hooks/useTransacoes';
import { RespostaUpload, Transacao } from '../types';

type Passo = 'upload' | 'conciliacao';
type Filtro = 'todos' | 'indefinidos';

export function HomePage() {
  const [passo, setPasso] = useState<Passo>('upload');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [resumoUpload, setResumoUpload] = useState<{ importadas: number; duplicadas: number } | null>(null);
  const { transacoes, definirTransacoes, classificar, atualizarObservacao } = useTransacoes();

  function handleUploadSucesso(resposta: RespostaUpload) {
    definirTransacoes(resposta.transacoes);
    setResumoUpload({ importadas: resposta.importadas, duplicadas: resposta.duplicadas });
    setPasso('conciliacao');
  }

  function handleNovaImportacao() {
    definirTransacoes([]);
    setResumoUpload(null);
    setPasso('upload');
    setFiltro('todos');
  }

  const indefinidos = transacoes.filter((t: Transacao) => t.classificacao === 'INDEFINIDO').length;

  const transacoesFiltradas =
    filtro === 'indefinidos'
      ? transacoes.filter((t: Transacao) => t.classificacao === 'INDEFINIDO')
      : transacoes;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <a
            href="/regras"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ⚙️ Gerenciar Regras
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {passo === 'upload' ? (
          <UploadZone onUploadSucesso={handleUploadSucesso} />
        ) : (
          <div className="space-y-6">
            {/* Resumo do upload */}
            {resumoUpload && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-700">
                ✅ <strong>{resumoUpload.importadas}</strong> transações importadas
                {resumoUpload.duplicadas > 0 && (
                  <> · <strong>{resumoUpload.duplicadas}</strong> duplicatas ignoradas</>
                )}
                {indefinidos > 0 && (
                  <> · <strong>{indefinidos}</strong> indefinidas para classificar</>
                )}
              </div>
            )}

            {/* Totalizadores */}
            <TotalizadoresBar transacoes={transacoes} />

            {/* Controles */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <FiltroRapido
                totalIndefinidos={indefinidos}
                filtro={filtro}
                onFiltroChange={setFiltro}
              />
              <BotaoGerarExtratos
                indefinidos={indefinidos}
                onNovaImportacao={handleNovaImportacao}
              />
            </div>

            {/* Tabela */}
            <TabelaConciliacao
              transacoes={transacoesFiltradas}
              onClassificar={classificar}
              onAtualizarObservacao={atualizarObservacao}
            />
          </div>
        )}
      </main>
    </div>
  );
}
