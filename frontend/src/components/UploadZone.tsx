import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import * as api from '../services/api';
import { RespostaUpload } from '../types';

interface Props {
  onUploadSucesso: (resposta: RespostaUpload) => void;
}

const EXTENSOES_VALIDAS = ['.csv', '.ofx', '.xls', '.xlsx'];
const LIMITE_TOTAL_PASTA_BYTES = 100 * 1024 * 1024;

interface OpcoesSelecao {
  autoEnviar: boolean;
  ignorarIncompativeis: boolean;
  origem: 'arquivos' | 'pasta';
}

export function UploadZone({ onUploadSucesso }: Props) {
  const [arrastando, setArrastando] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const inputArquivosRef = useRef<HTMLInputElement>(null);
  const inputPastaRef = useRef<HTMLInputElement>(null);

  function validarArquivo(file: File): boolean {
    const nome = file.name.toLowerCase();
    return EXTENSOES_VALIDAS.some((ext) => nome.endsWith(ext));
  }

  function formatarTamanho(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function limparSeletores() {
    if (inputArquivosRef.current) inputArquivosRef.current.value = '';
    if (inputPastaRef.current) inputPastaRef.current.value = '';
  }

  async function enviarArquivos(filesParaEnviar: File[]) {
    if (filesParaEnviar.length === 0) return;

    setCarregando(true);
    setErro(null);

    try {
      const resposta = await api.uploadArquivos(filesParaEnviar);
      onUploadSucesso(resposta);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { erro?: string } } })?.response?.data?.erro ||
        'Erro ao processar o arquivo. Verifique o formato e tente novamente.';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  async function selecionarArquivos(filesSelecionados: File[], opcoes: OpcoesSelecao) {
    if (filesSelecionados.length === 0) {
      setArquivos([]);
      setAviso(null);
      limparSeletores();
      return;
    }

    const arquivosCompativeis: File[] = [];
    let arquivosIgnorados = 0;
    let totalBytes = 0;

    for (const file of filesSelecionados) {
      if (!validarArquivo(file)) {
        if (opcoes.ignorarIncompativeis) {
          arquivosIgnorados += 1;
          continue;
        }

        setErro('Formato inválido. Envie apenas .csv, .ofx, .xls ou .xlsx');
        setAviso(null);
        setArquivos([]);
        limparSeletores();
        return;
      }

      totalBytes += file.size;
      if (totalBytes > LIMITE_TOTAL_PASTA_BYTES) {
        setErro('Falha ao analisar a pasta. Os arquivos compatíveis ultrapassam o limite total de 100MB.');
        setAviso(null);
        setArquivos([]);
        limparSeletores();
        return;
      }

      arquivosCompativeis.push(file);
    }

    if (arquivosCompativeis.length === 0) {
      setErro(
        opcoes.origem === 'pasta'
          ? 'Nenhum arquivo compatível encontrado na pasta selecionada.'
          : 'Formato inválido. Envie apenas .csv, .ofx, .xls ou .xlsx'
      );
      setArquivos([]);
      setAviso(null);
      limparSeletores();
      return;
    }

    setErro(null);
    setAviso(
      arquivosIgnorados > 0
        ? `${arquivosIgnorados} arquivo(s) incompatível(is) foram ignorado(s) na ${opcoes.origem}.`
        : null
    );
    setArquivos(arquivosCompativeis);

    if (opcoes.autoEnviar) {
      await enviarArquivos(arquivosCompativeis);
    }

    limparSeletores();
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(true);
  }

  function onDragLeave() {
    setArrastando(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    const files = Array.from(e.dataTransfer.files || []);
    void selecionarArquivos(files, {
      autoEnviar: false,
      ignorarIncompativeis: false,
      origem: 'arquivos',
    });
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    void selecionarArquivos(files, {
      autoEnviar: false,
      ignorarIncompativeis: false,
      origem: 'arquivos',
    });
  }

  function onFolderInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    void selecionarArquivos(files, {
      autoEnviar: true,
      ignorarIncompativeis: true,
      origem: 'pasta',
    });
  }

  function abrirSeletorPasta() {
    const input = inputPastaRef.current;
    if (!input) return;

    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.click();
  }

  const tamanhoFormatado = arquivos.reduce((total, file) => total + file.size, 0);
  const tamanhoTexto = formatarTamanho(tamanhoFormatado);
  const nomesArquivos = arquivos
    .slice(0, 5)
    .map((file) => file.webkitRelativePath || file.name)
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <h1 className="text-3xl font-bold text-gray-800">Conciliação Financeira</h1>
      <p className="text-gray-500 text-center max-w-md">
        Selecione arquivos avulsos ou uma pasta inteira para localizar extratos compatíveis e iniciar a conciliação.
      </p>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full max-w-xl border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${arrastando ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'}`}
      >
        <input
          ref={inputArquivosRef}
          type="file"
          accept=".csv,.ofx,.xls,.xlsx"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
        <input
          ref={inputPastaRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFolderInputChange}
        />
        <div className="text-5xl mb-4">📂</div>
        {arquivos.length > 0 ? (
          <div>
            <p className="font-semibold text-gray-700 text-lg">{arquivos.length} arquivo(s) selecionado(s)</p>
            <p className="text-gray-400 text-sm mt-1">{tamanhoTexto}</p>
            <p className="text-gray-500 text-xs mt-2">{nomesArquivos}{arquivos.length > 5 ? ', ...' : ''}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 font-medium">Arraste arquivos aqui ou use um dos seletores abaixo</p>
            <p className="text-gray-400 text-sm mt-1">Aceito: .csv, .ofx, .xls, .xlsx · 10MB por arquivo · 100MB por pasta</p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputArquivosRef.current?.click()}
            disabled={carregando}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:border-blue-400 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Selecionar arquivos
          </button>
          <button
            type="button"
            onClick={abrirSeletorPasta}
            disabled={carregando}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Selecionar pasta
          </button>
        </div>
      </div>

      {erro && (
        <div className="w-full max-w-xl bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
          {erro}
        </div>
      )}

      {aviso && !erro && (
        <div className="w-full max-w-xl bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg">
          {aviso}
        </div>
      )}

      {arquivos.length > 0 && (
        <button
          onClick={() => void enviarArquivos(arquivos)}
          disabled={carregando}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {carregando ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processando arquivos...
            </span>
          ) : 'Importar Extrato'}
        </button>
      )}
    </div>
  );
}
