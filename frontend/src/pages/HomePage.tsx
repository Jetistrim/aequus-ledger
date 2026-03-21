import { useState } from 'react';
import { UploadZone } from '../components/UploadZone';
import { RevisaoArquivos } from '../components/RevisaoArquivos';
import { RespostaUpload } from '../types';

type Passo = 'upload' | 'revisao';

const CHAVE_RESUMO_UPLOAD = 'conciliacao:resumo-upload';

/**
 * Página inicial do fluxo, responsável apenas por upload e revisão de arquivos.
 *
 * @remarks
 * Após o processamento com sucesso, persiste um resumo temporário e redireciona
 * para a página de conciliação.
 */
export function HomePage() {
  const [passo, setPasso] = useState<Passo>('upload');
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);

  function handleArquivosProntos(files: File[]) {
    setArquivosSelecionados(files);
    setPasso('revisao');
  }

  function handleUploadSucesso(resposta: RespostaUpload) {
    sessionStorage.setItem(
      CHAVE_RESUMO_UPLOAD,
      JSON.stringify({
        importadas: resposta.importadas,
        duplicadas: resposta.duplicadas,
        indefinidas: resposta.indefinidas,
      }),
    );
    window.location.assign('/conciliacao');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <div className="flex items-center gap-4">
            <a
              href="/conciliacao"
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              📋 Ir para Tabela
            </a>
            <a
              href="/regras"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ⚙️ Gerenciar Regras
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {passo === 'upload' ? (
          <UploadZone onArquivosProntos={handleArquivosProntos} />
        ) : (
          <RevisaoArquivos
            arquivosIniciais={arquivosSelecionados}
            onUploadSucesso={handleUploadSucesso}
            onVoltar={() => setPasso('upload')}
          />
        )}
      </main>
    </div>
  );
}
