import { useEffect, useRef, useState } from 'react';
import { TotalizadoresBar } from '../components/TotalizadoresBar';
import { FiltroRapido } from '../components/FiltroRapido';
import { TabelaConciliacao } from '../components/TabelaConciliacao';
import { BotaoGerarExtratos } from '../components/BotaoGerarExtratos';
import { BotaoLogout } from '../components/BotaoLogout';
import { useTransacoes } from '../hooks/useTransacoes';

type Filtro = 'todos' | 'indefinidos';
type FiltroClassificacao = 'TODAS' | 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
type FiltroTipo = 'TODOS' | 'ENTRADA' | 'SAIDA';

const ITENS_POR_PAGINA_OPCOES = [25, 50, 100] as const;
const CHAVE_RESUMO_UPLOAD = 'conciliacao:resumo-upload';

interface ResumoUploadPersistido {
  importadas: number;
  duplicadas: number;
  indefinidas: number;
}

/**
 * Traduz os filtros de UI para o parâmetro de classificação aceito pela API.
 */
function obterClassificacaoConsulta(
  filtroRapido: Filtro,
  filtroClassificacao: FiltroClassificacao,
): 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO' | undefined {
  if (filtroRapido === 'indefinidos') {
    return 'INDEFINIDO';
  }

  if (filtroClassificacao === 'TODAS') {
    return undefined;
  }

  return filtroClassificacao;
}

/**
 * Lê o resumo do último upload salvo temporariamente para feedback pós-redirecionamento.
 */
function lerResumoUpload(): ResumoUploadPersistido | null {
  const valorSalvo = sessionStorage.getItem(CHAVE_RESUMO_UPLOAD);
  if (!valorSalvo) {
    return null;
  }

  try {
    return JSON.parse(valorSalvo) as ResumoUploadPersistido;
  } catch {
    sessionStorage.removeItem(CHAVE_RESUMO_UPLOAD);
    return null;
  }
}

/**
 * Página de conciliação com tabela, filtros e paginação de transações.
 *
 * @remarks
 * Esta rota é independente da tela de importação, garantindo que refresh mantenha
 * o usuário no contexto da tabela.
 */
export function ConciliacaoPage() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [busca, setBusca] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filtroClassificacao, setFiltroClassificacao] = useState<FiltroClassificacao>('TODAS');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [itensPorPagina, setItensPorPagina] = useState<(typeof ITENS_POR_PAGINA_OPCOES)[number]>(25);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [resumoUpload, setResumoUpload] = useState<ResumoUploadPersistido | null>(() => lerResumoUpload());
  const [tentouCarregarExistentes, setTentouCarregarExistentes] = useState(false);
  const [mostrarAvisoSemDados, setMostrarAvisoSemDados] = useState(false);
  const [avisoSemDadosSaindo, setAvisoSemDadosSaindo] = useState(false);
  const [botaoCarregarDesabilitado, setBotaoCarregarDesabilitado] = useState(false);
  const timeoutFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { transacoes, paginacao, totais, carregando, erro, carregar, classificar, atualizarTransacao } = useTransacoes();
  const mostrandoFallbackInicial = Boolean(erro)
    && transacoes.length === 0
    && paginacao.totalRegistros === 0
    && !tentouCarregarExistentes;

  useEffect(() => {
    return () => {
      if (timeoutFadeRef.current) clearTimeout(timeoutFadeRef.current);
      if (timeoutHideRef.current) clearTimeout(timeoutHideRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (resumoUpload) {
      sessionStorage.removeItem(CHAVE_RESUMO_UPLOAD);
    }
  }, [resumoUpload]);

  function handleBuscaChange(valor: string) {
    setBuscaDigitada(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (valor.trim().length === 0) {
      setBusca('');
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (valor.trim().length >= 3) {
        setBusca(valor.trim());
      }
    }, 2000);
  }

  function mostrarToastSemDados() {
    if (timeoutFadeRef.current) {
      clearTimeout(timeoutFadeRef.current);
    }
    if (timeoutHideRef.current) {
      clearTimeout(timeoutHideRef.current);
    }

    setMostrarAvisoSemDados(true);
    setAvisoSemDadosSaindo(false);
    setBotaoCarregarDesabilitado(true);

    timeoutFadeRef.current = setTimeout(() => {
      setAvisoSemDadosSaindo(true);
    }, 2400);

    timeoutHideRef.current = setTimeout(() => {
      setMostrarAvisoSemDados(false);
      setAvisoSemDadosSaindo(false);
      setBotaoCarregarDesabilitado(false);
    }, 3200);
  }

  async function handleCarregarExistentes() {
    setTentouCarregarExistentes(true);
    setFiltro('todos');
    setBuscaDigitada('');
    setBusca('');
    setFiltroClassificacao('TODAS');
    setFiltroTipo('TODOS');
    setPaginaAtual(1);

    const carregadas = await carregar({ pagina: 1, limite: itensPorPagina });
    setResumoUpload(null);

    if (carregadas === null) {
      return;
    }

    if (carregadas.length > 0) {
      setMostrarAvisoSemDados(false);
      setBotaoCarregarDesabilitado(false);
      return;
    }

    mostrarToastSemDados();
  }

  function handleNovaImportacao() {
    window.location.assign('/');
  }

  const indefinidos = totais.indefinidos;

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtro, filtroClassificacao, filtroTipo, busca, itensPorPagina]);

  useEffect(() => {
    const classificacao = obterClassificacaoConsulta(filtro, filtroClassificacao);
    const tipo = filtroTipo === 'TODOS' ? undefined : filtroTipo;
    const buscaNormalizada = busca.trim();

    void carregar({
      pagina: paginaAtual,
      limite: itensPorPagina,
      classificacao,
      tipo,
      busca: buscaNormalizada.length > 0 ? buscaNormalizada : undefined,
    });
  }, [paginaAtual, itensPorPagina, filtro, filtroClassificacao, filtroTipo, busca, carregar]);

  useEffect(() => {
    if (paginacao.paginaAtual !== paginaAtual) {
      setPaginaAtual(paginacao.paginaAtual);
    }
  }, [paginacao.paginaAtual, paginaAtual]);

  useEffect(() => {
    if (!mostrandoFallbackInicial) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void carregar({ pagina: 1, limite: itensPorPagina });
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [mostrandoFallbackInicial, carregar, itensPorPagina]);

  const indiceInicio = paginacao.totalRegistros === 0
    ? 0
    : (paginacao.paginaAtual - 1) * paginacao.limite + 1;
  const indiceFim = Math.min(paginacao.paginaAtual * paginacao.limite, paginacao.totalRegistros);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              ⬆️ Importar Arquivos
            </a>
            <a
              href="/regras"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ⚙️ Gerenciar Regras
            </a>
            <BotaoLogout />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {mostrandoFallbackInicial && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800">Aguardando sistema iniciar...</p>
                <p className="mt-1 text-sm text-blue-700">
                  Isso pode levar alguns segundos na primeira abertura. Vamos tentar novamente automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Visualizar dados já salvos</h2>
              <p className="text-sm text-gray-500">
                Carregue as transações existentes do servidor sem precisar enviar novos arquivos.
              </p>
            </div>
            <button
              onClick={handleCarregarExistentes}
              disabled={carregando || botaoCarregarDesabilitado}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Carregando...' : 'Carregar dados existentes'}
            </button>
          </div>
          {erro && !mostrandoFallbackInicial && <p className="mt-3 text-sm text-red-600">{erro}</p>}
          {tentouCarregarExistentes && !carregando && !erro && transacoes.length === 0 && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Nenhuma transação salva foi encontrada. Faça uma importação para começar.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {resumoUpload && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-700">
              ✅ <strong>{resumoUpload.importadas}</strong> transações importadas
              {resumoUpload.duplicadas > 0 && (
                <> · <strong>{resumoUpload.duplicadas}</strong> duplicatas ignoradas</>
              )}
              {resumoUpload.indefinidas > 0 && (
                <> · <strong>{resumoUpload.indefinidas}</strong> indefinidas para classificar</>
              )}
            </div>
          )}

          <TotalizadoresBar totais={totais} />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCarregarExistentes}
                disabled={carregando || botaoCarregarDesabilitado}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {carregando ? 'Recarregando...' : 'Recarregar dados'}
              </button>
              <FiltroRapido
                totalIndefinidos={indefinidos}
                filtro={filtro}
                onFiltroChange={setFiltro}
              />
            </div>
            <BotaoGerarExtratos
              totalTransacoes={paginacao.totalRegistros}
              indefinidos={indefinidos}
              onNovaImportacao={handleNovaImportacao}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Buscar
                </span>
                <input
                  type="text"
                  value={buscaDigitada}
                  onChange={(e) => handleBuscaChange(e.target.value)}
                  placeholder="Mín. 3 caracteres · aguarda 2s para pesquisar..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {buscaDigitada.trim().length > 0 && buscaDigitada.trim().length < 3 && (
                  <p className="mt-1 text-xs text-amber-600">Digite ao menos 3 caracteres para pesquisar.</p>
                )}
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Classificação
                </span>
                <select
                  value={filtroClassificacao}
                  onChange={(e) => setFiltroClassificacao(e.target.value as FiltroClassificacao)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="TODAS">Todas</option>
                  <option value="PESSOAL">Pessoal</option>
                  <option value="EMPRESA">Empresa</option>
                  <option value="INDEFINIDO">Indefinido</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo
                </span>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </label>
            </div>
          </div>

          <TabelaConciliacao
            transacoes={transacoes}
            onClassificar={async (id, classificacao) => {
              await classificar(id, classificacao);
              const classificacaoConsulta = obterClassificacaoConsulta(filtro, filtroClassificacao);
              const tipo = filtroTipo === 'TODOS' ? undefined : filtroTipo;
              const buscaNormalizada = busca.trim();
              await carregar({
                pagina: paginaAtual,
                limite: itensPorPagina,
                classificacao: classificacaoConsulta,
                tipo,
                busca: buscaNormalizada.length > 0 ? buscaNormalizada : undefined,
              });
            }}
            onAtualizarTransacao={async (id, payload) => {
              await atualizarTransacao(id, payload);
              const classificacaoConsulta = obterClassificacaoConsulta(filtro, filtroClassificacao);
              const tipo = filtroTipo === 'TODOS' ? undefined : filtroTipo;
              const buscaNormalizada = busca.trim();
              await carregar({
                pagina: paginaAtual,
                limite: itensPorPagina,
                classificacao: classificacaoConsulta,
                tipo,
                busca: buscaNormalizada.length > 0 ? buscaNormalizada : undefined,
              });
            }}
          />

          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-600">
              Mostrando <strong>{indiceInicio}</strong> a <strong>{indiceFim}</strong> de{' '}
              <strong>{paginacao.totalRegistros}</strong> transações.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Itens por página
                <select
                  value={itensPorPagina}
                  onChange={(e) => setItensPorPagina(Number(e.target.value) as (typeof ITENS_POR_PAGINA_OPCOES)[number])}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
                >
                  {ITENS_POR_PAGINA_OPCOES.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginacao.paginaAtual === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-700">
                  Página <strong>{paginacao.paginaAtual}</strong> de <strong>{paginacao.totalPaginas}</strong>
                </span>
                <button
                  onClick={() => setPaginaAtual((p) => Math.min(paginacao.totalPaginas, p + 1))}
                  disabled={paginacao.paginaAtual === paginacao.totalPaginas}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {mostrarAvisoSemDados && (
        <div
          className={`fixed right-6 top-24 z-50 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg transition-opacity duration-700 ${
            avisoSemDadosSaindo ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Nenhum dado encontrado no servidor. Faça uma importação para visualizar a tabela.
        </div>
      )}
    </div>
  );
}
