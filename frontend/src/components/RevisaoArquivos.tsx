import { useState, useRef, ChangeEvent } from 'react';
import * as api from '../services/api';
import { RespostaUpload } from '../types';

interface ArquivoComId {
  arquivo: File;
  identificador: string;
}

interface Props {
  arquivosIniciais: File[];
  onUploadSucesso: (resposta: RespostaUpload) => void;
  onVoltar: () => void;
}

const EXTENSOES_VALIDAS = ['.csv', '.ofx', '.xls', '.xlsx'];
const LIMITE_TOTAL_BYTES = 100 * 1024 * 1024; // 100 MB
const CHAVE_LOCALSTORAGE = 'conciliacao:identificadores';
const MAX_SALVOS = 20;

function obterIdsSalvos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_LOCALSTORAGE) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function salvarIds(ids: string[]) {
  const lista = obterIdsSalvos();
  for (const id of [...ids].reverse()) {
    const idx = lista.indexOf(id);
    if (idx > -1) lista.splice(idx, 1);
    lista.unshift(id);
  }
  localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(lista.slice(0, MAX_SALVOS)));
}

function validarArquivo(f: File): boolean {
  return EXTENSOES_VALIDAS.some((ext) => f.name.toLowerCase().endsWith(ext));
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconeArquivo(nome: string): string {
  const ext = nome.toLowerCase().split('.').pop();
  if (ext === 'ofx') return '🏦';
  if (ext === 'xlsx' || ext === 'xls') return '📋';
  if (ext === 'csv') return '📊';
  return '📄';
}

const DATALIST_ID = 'identificadores-salvos-list';

export function RevisaoArquivos({ arquivosIniciais, onUploadSucesso, onVoltar }: Props) {
  const [itens, setItens] = useState<ArquivoComId[]>(
    arquivosIniciais.map((a) => ({ arquivo: a, identificador: '' }))
  );
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputExtraRef = useRef<HTMLInputElement>(null);
  const inputPastaRef = useRef<HTMLInputElement>(null);
  const idsSalvos = obterIdsSalvos();

  function atualizarId(idx: number, valor: string) {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, identificador: valor } : item)));
  }

  function remover(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function adicionarArquivos(novos: File[], ignorarIncompativeis: boolean) {
    const validos: File[] = [];
    let ignorados = 0;
    let totalBytes = itens.reduce((acc, i) => acc + i.arquivo.size, 0);

    for (const f of novos) {
      if (!validarArquivo(f)) {
        if (ignorarIncompativeis) {
          ignorados++;
          continue;
        }
        setErro('Formato inválido. Envie apenas .csv, .ofx, .xls ou .xlsx');
        return;
      }
      totalBytes += f.size;
      if (totalBytes > LIMITE_TOTAL_BYTES) {
        setErro('Os arquivos ultrapassam o limite total de 100 MB.');
        return;
      }
      validos.push(f);
    }

    const existentes = new Set(itens.map((i) => i.arquivo.name));
    const novosUnicos = validos.filter((f) => !existentes.has(f.name));

    if (novosUnicos.length === 0 && validos.length > 0) {
      setAviso('Todos os arquivos selecionados já estão na lista.');
      return;
    }

    setErro(null);
    setAviso(ignorados > 0 ? `${ignorados} arquivo(s) incompatível(is) foram ignorados.` : null);
    setItens((prev) => [...prev, ...novosUnicos.map((a) => ({ arquivo: a, identificador: '' }))]);
  }

  function onInputExtraChange(e: ChangeEvent<HTMLInputElement>) {
    adicionarArquivos(Array.from(e.target.files ?? []), false);
    if (inputExtraRef.current) inputExtraRef.current.value = '';
  }

  function onPastaChange(e: ChangeEvent<HTMLInputElement>) {
    adicionarArquivos(Array.from(e.target.files ?? []), true);
    if (inputPastaRef.current) inputPastaRef.current.value = '';
  }

  function abrirSeletorPasta() {
    const input = inputPastaRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.click();
  }

  async function handleProcessar() {
    if (itens.length === 0) return;

    const identificadores: Record<string, string> = {};
    for (const { arquivo, identificador } of itens) {
      if (identificador.trim()) {
        identificadores[arquivo.name] = identificador.trim();
      }
    }

    const novosIds = [...new Set(Object.values(identificadores))].filter(Boolean);
    if (novosIds.length > 0) salvarIds(novosIds);

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await api.uploadArquivos(
        itens.map((i) => i.arquivo),
        identificadores
      );
      onUploadSucesso(resposta);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { erro?: string } } })?.response?.data?.erro ??
        'Erro ao processar os arquivos. Verifique o formato e tente novamente.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  const totalBytes = itens.reduce((acc, i) => acc + i.arquivo.size, 0);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-full max-w-2xl">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Revisar Arquivos</h2>
            <p className="text-gray-500 text-sm mt-1">
              {itens.length} arquivo(s) · {formatarTamanho(totalBytes)} no total
            </p>
          </div>
          <button
            onClick={onVoltar}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
          >
            ← Voltar
          </button>
        </div>

        {/* Dica de identificador */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 mb-5 leading-relaxed">
          <strong>💡 Identificador:</strong> nomeie cada arquivo com o banco e o titular, como{' '}
          <em className="font-medium">"Santander do Gabriel"</em> ou{' '}
          <em className="font-medium">"Nubank da Empresa"</em>. Esse rótulo aparecerá na coluna
          coluna Identificador de cada transação.
          {idsSalvos.length > 0 && (
            <span className="block mt-1 text-blue-600/80 text-xs">
              ✓ Identificadores anteriores aparecem como sugestão ao clicar no campo.
            </span>
          )}
        </div>

        {/* Lista de arquivos */}
        <div className="space-y-3 mb-5">
          {itens.map((item, idx) => (
            <div
              key={`${item.arquivo.name}-${idx}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:border-gray-300 transition-colors"
            >
              <span className="text-2xl flex-shrink-0 select-none">
                {iconeArquivo(item.arquivo.name)}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" title={item.arquivo.name}>
                  {item.arquivo.name}
                </p>
                <p className="text-xs text-gray-400">{formatarTamanho(item.arquivo.size)}</p>
              </div>

              <div className="w-64 flex-shrink-0">
                <input
                  type="text"
                  list={DATALIST_ID}
                  value={item.identificador}
                  onChange={(e) => atualizarId(idx, e.target.value)}
                  placeholder="Ex: Santander do Gabriel"
                  maxLength={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
                    placeholder:text-gray-400 transition-shadow"
                />
              </div>

              <button
                onClick={() => remover(idx)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                  text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xl leading-none"
                title="Remover arquivo"
              >
                ×
              </button>
            </div>
          ))}

          {itens.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              Nenhum arquivo na lista. Adicione arquivos abaixo.
            </div>
          )}
        </div>

        {/* Datalist com identificadores salvos */}
        <datalist id={DATALIST_ID}>
          {idsSalvos.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>

        {/* Inputs ocultos para adicionar mais arquivos */}
        <input
          ref={inputExtraRef}
          type="file"
          accept=".csv,.ofx,.xls,.xlsx"
          multiple
          className="hidden"
          onChange={onInputExtraChange}
        />
        <input
          ref={inputPastaRef}
          type="file"
          multiple
          className="hidden"
          onChange={onPastaChange}
        />

        {/* Botões de adicionar mais */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => inputExtraRef.current?.click()}
            disabled={carregando}
            className="px-4 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-600
              hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 transition-colors"
          >
            + Adicionar arquivos
          </button>
          <button
            type="button"
            onClick={abrirSeletorPasta}
            disabled={carregando}
            className="px-4 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-600
              hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 transition-colors"
          >
            + Adicionar pasta
          </button>
        </div>

        {/* Erros e avisos */}
        {erro && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {erro}
          </div>
        )}
        {aviso && !erro && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">
            {aviso}
          </div>
        )}

        {/* Botão processar */}
        <button
          onClick={() => void handleProcessar()}
          disabled={carregando || itens.length === 0}
          className="w-full px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold
            hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {carregando ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processando arquivos...
            </span>
          ) : (
            `Processar ${itens.length} arquivo(s)`
          )}
        </button>
      </div>
    </div>
  );
}
