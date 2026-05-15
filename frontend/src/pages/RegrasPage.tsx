import { useNavigate, useSearchParams } from 'react-router-dom';
import { PainelRegras } from '../components/PainelRegras';
import { BotaoDesligarSistema } from '../components/BotaoDesligarSistema';
import { BotaoLogout } from '../components/BotaoLogout';

/**
 * Página de gerenciamento de regras de classificação.
 * 
 * @remarks
 * O contexto de navegação é mantido minimamente via query params:
 * - `modalTeste=1` indica que o modal de teste está aberto
 */
export function RegrasPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Estado do modal de teste é sincronizado com URL
  const modalTesteAberto = searchParams.get('modalTeste') === '1';

  // Função para abrir/fechar modal de teste
  const handleAbrirModalTeste = () => {
    setSearchParams({ modalTeste: '1' }, { replace: true });
  };

  const handleFecharModalTeste = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <div className="flex items-center gap-4">
            <a
              href="/conciliacao"
              onClick={(e) => {
                e.preventDefault();
                navigate('/conciliacao');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ← Voltar à Conciliação
            </a>
            <BotaoDesligarSistema />
            <BotaoLogout />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PainelRegras 
          modalTesteAberto={modalTesteAberto}
          onAbrirModalTeste={handleAbrirModalTeste}
          onFecharModalTeste={handleFecharModalTeste}
        />
      </main>
    </div>
  );
}
