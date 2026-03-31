import { useState } from 'react';
import { Transacao, Classificacao } from '../types';
import { AtualizacaoTransacaoPayload } from '../services/api';
import { ModalEdicao } from './ModalEdicao';
import { TooltipTexto } from './TooltipTexto';
import { getLinhaClassName, shouldShowReviewTag } from './conciliacaoVisualState';

interface Props {
  transacoes: Transacao[];
  carregando?: boolean;
  onClassificar: (id: string, classificacao: Classificacao) => Promise<void>;
  onAtualizarTransacao: (id: string, payload: AtualizacaoTransacaoPayload) => Promise<void>;
}

// Larguras da coluna Descrição por linha — arrays estáticos fora do componente,
// alocados uma vez no módulo para não serem recriados a cada render.
const SKELETON_WIDTHS_DESC = ['w-2/3', 'w-3/4', 'w-1/2', 'w-4/5', 'w-2/3', 'w-3/5', 'w-3/4', 'w-5/6'] as const;

function TabelaSkeletonLinhas() {
  return (
    <>
      {SKELETON_WIDTHS_DESC.map((w, i) => (
        <tr key={i} aria-hidden="true">
          <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
          <td className="px-4 py-3"><div className={`h-4 ${w} bg-gray-200 rounded animate-pulse`} /></td>
          <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
          <td className="px-4 py-3 text-center"><div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse mx-auto" /></td>
          <td className="px-4 py-3 text-center"><div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse mx-auto" /></td>
          <td className="px-4 py-3 text-center"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse mx-auto" /></td>
          <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
          <td className="px-4 py-3 text-center"><div className="h-6 w-16 bg-gray-200 rounded animate-pulse mx-auto" /></td>
        </tr>
      ))}
    </>
  );
}

const badgeClassificacao: Record<Classificacao, string> = {
  PESSOAL: 'bg-green-100 text-green-800',
  EMPRESA: 'bg-blue-100 text-blue-800',
  INDEFINIDO: 'bg-red-100 text-red-800',
};

function contemIndicadorPix(descricao: string): boolean {
  return /\bPIX\b/i.test(descricao) || /\bQR\s*CODE\b/i.test(descricao);
}

/**
 * Tabela principal de conciliação com atalhos de classificação e edição completa por modal.
 */
export function TabelaConciliacao({ transacoes, carregando = false, onClassificar, onAtualizarTransacao }: Props) {
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);

  // Skeleton de carga inicial: sem dados ainda, substitui o estado vazio
  if (carregando && transacoes.length === 0) {
    return (
      <div
        className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm"
        aria-busy="true"
        aria-label="Carregando transações"
      >
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classificação</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo Desp.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identificador</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            <TabelaSkeletonLinhas />
          </tbody>
        </table>
      </div>
    );
  }

  if (transacoes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 border border-dashed border-gray-300 rounded-xl bg-white">
        <p className="text-lg font-medium text-gray-700">Nenhuma transação carregada.</p>
        <p className="mt-2 text-sm text-gray-500">
          Use o botão de carregar dados existentes ou faça uma nova importação de arquivos.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`overflow-x-auto rounded-xl border border-gray-200 shadow-sm transition-opacity duration-200${carregando ? ' opacity-50 pointer-events-none' : ''}`}>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Classificação</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo Desp.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identificador</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {transacoes.map((t) => {
              const emRevisao = shouldShowReviewTag(t);
              const pixIndefinido = t.classificacao === 'INDEFINIDO' && contemIndicadorPix(t.descricao);

              return (
                <tr
                  key={t.id}
                  className={`${getLinhaClassName(t)} cursor-pointer hover:brightness-95 transition-all`}
                  onDoubleClick={() => setTransacaoEditando(t)}
                >
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {new Date(t.dataTransacao).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-gray-800 max-w-xs overflow-hidden">
                  <TooltipTexto texto={t.descricao} className="text-gray-800 text-sm" /></td>
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
                  {emRevisao && (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                      Em revisão
                    </span>
                  )}
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
                <td className="px-4 py-3 max-w-[160px] overflow-hidden">
                  <TooltipTexto texto={t.identificador} className="text-gray-500 text-xs" />
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
                      title="Editar transação"
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
          onSalvar={onAtualizarTransacao}
        />
      )}
    </>
  );
}
