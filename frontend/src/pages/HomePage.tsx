import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadZone } from '../components/UploadZone';
import { RevisaoArquivos } from '../components/RevisaoArquivos';
import { BotaoLogout } from '../components/BotaoLogout';
import { RespostaUpload } from '../types';

type Passo = 'upload' | 'revisao';

const CHAVE_RESUMO_UPLOAD = 'conciliacao:resumo-upload';

/**
 * Página inicial do fluxo, responsável apenas por upload e revisão de arquivos.
 *
 * @remarks
 * Após o processamento com sucesso, persiste um resumo temporário e redireciona
 * para a página de conciliação.
 * 
 * O passo (upload/revisao) é persistido via query param, mas File[] não pode ser restaurado
 * após refresh por restrição do navegador. Se abrir em revisao sem arquivos, volta para upload.
 */
export function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Inicializar passo a partir da URL, com fallback para 'upload'
  const passoUrl = searchParams.get('passo') as Passo | null;
  const [passo, setPasso] = useState<Passo>(passoUrl === 'revisao' ? 'revisao' : 'upload');
  const [arquivosSelecionados, setArquivosSelecionados] = useState<File[]>([]);

  // Sincronizar passo com URL
  useEffect(() => {
    if (passo === 'revisao') {
      setSearchParams({ passo: 'revisao' }, { replace: true });
    } else {
      // Limpar query params quando volta para upload
      setSearchParams({}, { replace: true });
    }
  }, [passo, setSearchParams]);

  // Se abrir com passo=revisao mas sem arquivos (após refresh), voltar para upload com aviso
  useEffect(() => {
    if (passo === 'revisao' && arquivosSelecionados.length === 0 && passoUrl === 'revisao') {
      // Usuário tentou voltar a revisao após refresh, mas os arquivos foram perdidos
      setPasso('upload');
      // Opcional: mostrar toast indicando que precisa fazer upload novamente
    }
  }, []);

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
    navigate('/conciliacao');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <div className="flex items-center gap-4">
            <a
              href="/conciliacao"
              onClick={(e) => {
                e.preventDefault();
                navigate('/conciliacao');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              📋 Ir para Tabela
            </a>
            <a
              href="/regras"
              onClick={(e) => {
                e.preventDefault();
                navigate('/regras');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ⚙️ Gerenciar Regras
            </a>
            <BotaoLogout />
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
