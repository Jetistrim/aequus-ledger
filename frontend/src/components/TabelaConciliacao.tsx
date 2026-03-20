import { useState } from 'react';
import { Transacao, Classificacao } from '../types';
import { ModalEdicao } from './ModalEdicao';

interface Props {
  transacoes: Transacao[];
  onClassificar: (id: string, classificacao: Classificacao) => Promise<void>;
  onAtualizarObservacao: (id: string, observacao: string, categoriaGenerica: string | null) => Promise<void>;
}

const corLinha: Record<Classificacao, string> = {
  PESSOAL: 'bg-green-50 border-l-4 border-green-400',
  EMPRESA: 'bg-blue-50 border-l-4 border-blue-400',
  INDEFINIDO: 'bg-red-50 border-l-4 border-red-400',
};

const badgeClassificacao: Record<Classificacao, string> = {
  PESSOAL: 'bg-green-100 text-green-800',
  EMPRESA: 'bg-blue-100 text-blue-800',
  INDEFINIDO: 'bg-red-100 text-red-800',
};

function contemIndicadorPix(descricao: string): boolean {
  return /\bPIX\b/i.test(descricao) || /\bQR\s*CODE\b/i.test(descricao);
}

export function TabelaConciliacao({ transacoes, onClassificar, onAtualizarObservacao }: Props) {
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);

  if (transacoes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">Nenhuma transação encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classificação</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo Desp.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observação</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transacoes.map((t) => {
              // State A: PIX já classificado automaticamente — sinalizar para revisão suave
              const pixAutoClassificado = t.pixAutoClassificado === true;
              // State B/C: PIX ainda indefinido
              const pixIndefinido = t.classificacao === 'INDEFINIDO' && contemIndicadorPix(t.descricao);

              let classeLinha: string;
              if (pixAutoClassificado) {
                // Fundo normal (verde/azul) mas borda amarela suave indicando revisão
                const fundoNormal = t.classificacao === 'PESSOAL' ? 'bg-green-50' : 'bg-blue-50';
                classeLinha = `${fundoNormal} border-l-4 border-yellow-300`;
              } else if (pixIndefinido) {
                classeLinha = 'bg-yellow-50 border-l-4 border-yellow-400';
              } else {
                classeLinha = corLinha[t.classificacao];
              }

              return (
                <tr
                  key={t.id}
                  className={`${classeLinha} cursor-pointer hover:brightness-95 transition-all`}
                  onDoubleClick={() => setTransacaoEditando(t)}
                >
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {new Date(t.dataTransacao).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-gray-800 max-w-xs truncate">{t.descricao}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-800">
                  {Number(t.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    t.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {t.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-center flex flex-col items-center gap-1 justify-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeClassificacao[t.classificacao]}`}>
                    {t.classificacao}
                  </span>
                  {/* State A: badge "Em revisão" para PIX auto-classificado */}
                  {pixAutoClassificado && (
                    <span className="ml-2 text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                      🔁 Em revisão
                    </span>
                  )}
                  {/* State B/C: badge PIX para indefinidos */}
                  {pixIndefinido && (
                    <div className="mt-1">
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
                        PIX
                      </span>
                      {t.labelHeuristica && (
                        <p className="text-xs text-gray-400 mt-1">{t.labelHeuristica}</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-gray-500">
                    {t.categoriaGenerica || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                  {t.observacao || '-'}
                </td>
                <td className="zpx-4 py-3 text-center">
                  {t.classificacao === 'INDEFINIDO' ? (
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex gap-1 justify-center">
                        {/* State B: botão sugerido destacado */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onClassificar(t.id, 'PESSOAL'); }}
                          className={`px-2 py-1 text-xs rounded transition-colors text-white ${
                            t.sugestaoClassificacao === 'PESSOAL'
                              ? 'bg-green-700 ring-2 ring-green-400 font-semibold'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          {t.sugestaoClassificacao === 'PESSOAL' ? '✓ Pessoal' : 'Pessoal'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onClassificar(t.id, 'EMPRESA'); }}
                          className={`px-2 py-1 text-xs rounded transition-colors text-white ${
                            t.sugestaoClassificacao === 'EMPRESA'
                              ? 'bg-blue-700 ring-2 ring-blue-400 font-semibold'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {t.sugestaoClassificacao === 'EMPRESA' ? '✓ Empresa' : 'Empresa'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setTransacaoEditando(t); }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Editar observação"
                    >
                      ✏️
                    </button>
                  )}
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {transacaoEditando && (
        <ModalEdicao
          transacao={transacaoEditando}
          onFechar={() => setTransacaoEditando(null)}
          onSalvar={onAtualizarObservacao}
        />
      )}
    </>
  );
}
