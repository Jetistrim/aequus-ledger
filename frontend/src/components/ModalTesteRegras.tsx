import { useMemo, useState } from 'react';
import {
  Categoria,
  ModoTesteRegras,
  RegraTemporariaTeste,
  RespostaTesteRegras,
} from '../types';
import { ApiRequestError, testarRegras } from '../services/api';

interface Props {
  regraTemporariaInicial: RegraTemporariaTeste;
  onFechar: () => void;
}

interface LinhaAmostraManual {
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
}

function parseLinhasAmostra(raw: string): LinhaAmostraManual[] {
  return raw
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => {
      const [descricao = '', valor = '0', tipo = 'SAIDA'] = linha.split(';').map((item) => item.trim());
      const tipoNormalizado: LinhaAmostraManual['tipo'] = tipo.toUpperCase() === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
      return {
        descricao,
        valor: Number(valor.replace(',', '.')),
        tipo: tipoNormalizado,
      };
    })
    .filter((item) => item.descricao.length > 0 && Number.isFinite(item.valor));
}

/**
 * Modal de apoio para testar cenários de classificação com regras salvas e temporárias.
 */
export function ModalTesteRegras({ regraTemporariaInicial, onFechar }: Props) {
  const [modoRegras, setModoRegras] = useState<ModoTesteRegras>('AMBAS');
  const [usarIndefinidasBanco, setUsarIndefinidasBanco] = useState(true);
  const [filtroClassificacaoBanco, setFiltroClassificacaoBanco] = useState<'TODAS' | 'INDEFINIDO' | 'PESSOAL' | 'EMPRESA'>('TODAS');
  const [limiteAmostras, setLimiteAmostras] = useState(120);
  const [incluirRegraTemporaria, setIncluirRegraTemporaria] = useState(true);
  const [regraTemporaria, setRegraTemporaria] = useState<RegraTemporariaTeste>(regraTemporariaInicial);
  const [textoAmostras, setTextoAmostras] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaTesteRegras | null>(null);

  const linhasAmostra = useMemo(() => parseLinhasAmostra(textoAmostras), [textoAmostras]);

  async function handleExecutarTeste() {
    setErro(null);
    setCarregando(true);

    try {
      const payload = {
        modoRegras,
        usarIndefinidasBanco,
        filtroClassificacaoBanco,
        limiteAmostras,
        regrasTemporarias:
          incluirRegraTemporaria && regraTemporaria.palavraChave.trim().length > 0
            ? [{ ...regraTemporaria, subCategoria: regraTemporaria.subCategoria?.trim() || undefined }]
            : [],
        amostrasManuais: linhasAmostra,
      };

      const resposta = await testarRegras(payload);
      setResultado(resposta);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const detalhe = err.details[0]?.mensagem;
        setErro(detalhe || err.message);
      } else {
        setErro('Não foi possível executar o diagnóstico de regras.');
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-teste-regras-titulo"
        data-testid="modal-teste"
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 id="modal-teste-regras-titulo" className="text-xl font-bold text-gray-800">Teste de Regras</h2>
            <p className="text-sm text-gray-500">Diagnóstico assistido para ajustar palavras-chave, categoria e prioridade.</p>
          </div>
          <button onClick={onFechar} className="text-sm text-gray-500 hover:text-gray-700">Fechar</button>
        </div>

        <div className="grid max-h-[calc(92vh-72px)] grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[320px_1fr]">
          <section className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Modo de Regras</label>
              <select
                value={modoRegras}
                onChange={(e) => setModoRegras(e.target.value as ModoTesteRegras)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="SALVAS">Somente salvas</option>
                <option value="TEMPORARIAS">Somente temporárias</option>
                <option value="AMBAS">Ambas (temporária + salvas)</option>
              </select>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={usarIndefinidasBanco}
                  onChange={(e) => setUsarIndefinidasBanco(e.target.checked)}
                />
                Incluir amostras do banco
              </label>
              <label className="block text-xs text-gray-500">Filtro de classificação no banco</label>
              <select
                value={filtroClassificacaoBanco}
                onChange={(e) => setFiltroClassificacaoBanco(e.target.value as 'TODAS' | 'INDEFINIDO' | 'PESSOAL' | 'EMPRESA')}
                disabled={!usarIndefinidasBanco}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="TODAS">Todas</option>
                <option value="INDEFINIDO">Somente indefinidas</option>
                <option value="PESSOAL">Somente pessoal</option>
                <option value="EMPRESA">Somente empresa</option>
              </select>
              <label className="block text-xs text-gray-500">Limite de amostras do banco</label>
              <input
                type="number"
                min={1}
                max={500}
                value={limiteAmostras}
                onChange={(e) => setLimiteAmostras(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={incluirRegraTemporaria}
                  onChange={(e) => setIncluirRegraTemporaria(e.target.checked)}
                />
                Testar regra temporária
              </label>

              <input
                type="text"
                value={regraTemporaria.palavraChave}
                onChange={(e) => setRegraTemporaria((prev) => ({ ...prev, palavraChave: e.target.value }))}
                placeholder="Palavras-chave"
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={regraTemporaria.categoria}
                  onChange={(e) => setRegraTemporaria((prev) => ({ ...prev, categoria: e.target.value as Categoria }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="PESSOAL">Pessoal</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={regraTemporaria.prioridade ?? 0}
                  onChange={(e) => setRegraTemporaria((prev) => ({ ...prev, prioridade: Number(e.target.value) || 0 }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                value={regraTemporaria.subCategoria ?? ''}
                onChange={(e) => setRegraTemporaria((prev) => ({ ...prev, subCategoria: e.target.value }))}
                placeholder="Subcategoria (opcional)"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Amostras manuais
              </label>
              <textarea
                rows={6}
                value={textoAmostras}
                onChange={(e) => setTextoAmostras(e.target.value)}
                placeholder={'Uma por linha: descricao;valor;tipo\nEx: PIX ENVIADO IFOOD;45.90;SAIDA'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs"
              />
              <p className="mt-1 text-xs text-gray-500">Linhas válidas: {linhasAmostra.length}</p>
            </div>

            {erro && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}

            <button
              onClick={handleExecutarTeste}
              disabled={carregando}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {carregando ? 'Executando...' : 'Executar Teste'}
            </button>
          </section>

          <section className="space-y-4">
            {!resultado ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                Execute o teste para visualizar o diagnóstico completo.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase text-gray-500">Origem</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">{resultado.origemAmostras}</p>
                    <p className="text-xs text-gray-500">Total: {resultado.totalAmostras}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase text-gray-500">Indefinidas atuais</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">{resultado.resumoClassificacaoAtual.indefinido}</p>
                    <p className="text-xs text-gray-500">{resultado.resumoClassificacaoAtual.percentualIndefinido}% da amostra</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs uppercase text-gray-500">Indefinidas após teste</p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">{resultado.resumoClassificacaoTeste.indefinido}</p>
                    <p className="text-xs text-gray-500">{resultado.resumoClassificacaoTeste.percentualIndefinido}% da amostra</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h3 className="mb-2 text-sm font-semibold text-gray-800">PIX por faixa de valor</h3>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {resultado.pixPorFaixaValor.length === 0 && <li>Sem registros.</li>}
                      {resultado.pixPorFaixaValor.map((item) => (
                        <li key={item.faixaValor}>
                          {item.faixaValor}: {item.quantidade} (médio R$ {item.valorMedio.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h3 className="mb-2 text-sm font-semibold text-gray-800">Não-PIX por faixa de valor</h3>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {resultado.naoPixPorFaixaValor.length === 0 && <li>Sem registros.</li>}
                      {resultado.naoPixPorFaixaValor.map((item) => (
                        <li key={item.faixaValor}>
                          {item.faixaValor}: {item.quantidade} (médio R$ {item.valorMedio.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h3 className="mb-2 text-sm font-semibold text-gray-800">Top descrições PIX</h3>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {resultado.topDescricoesPix.length === 0 && <li>Sem registros.</li>}
                      {resultado.topDescricoesPix.map((item) => (
                        <li key={`${item.descricaoResumida}-pix`}>
                          {item.descricaoResumida} ({item.quantidade}x)
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <h3 className="mb-2 text-sm font-semibold text-gray-800">Top descrições Não-PIX</h3>
                    <ul className="space-y-1 text-xs text-gray-700">
                      {resultado.topDescricoesNaoPix.length === 0 && <li>Sem registros.</li>}
                      {resultado.topDescricoesNaoPix.map((item) => (
                        <li key={`${item.descricaoResumida}-nao-pix`}>
                          {item.descricaoResumida} ({item.quantidade}x)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left">Descrição</th>
                        <th className="px-2 py-2 text-center">Atual</th>
                        <th className="px-2 py-2 text-center">Teste</th>
                        <th className="px-2 py-2 text-center">Mecanismo</th>
                        <th className="px-2 py-2 text-center">Conf.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resultado.resultados.slice(0, 30).map((item) => (
                        <tr key={item.indice}>
                          <td className="px-2 py-2 text-gray-700">{item.descricao}</td>
                          <td className="px-2 py-2 text-center">{item.classificacaoOriginal ?? '-'}</td>
                          <td className="px-2 py-2 text-center font-semibold">{item.classificacaoTeste}</td>
                          <td className="px-2 py-2 text-center">{item.mecanismo}</td>
                          <td className="px-2 py-2 text-center">{item.confianca}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
