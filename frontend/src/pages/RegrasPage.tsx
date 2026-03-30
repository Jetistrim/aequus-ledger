import { PainelRegras } from '../components/PainelRegras';
import { BotaoLogout } from '../components/BotaoLogout';

/**
 * Página de gerenciamento de regras de classificação.
 */
export function RegrasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <div className="flex items-center gap-4">
            <a
              href="/conciliacao"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              ← Voltar à Conciliação
            </a>
            <BotaoLogout />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PainelRegras />
      </main>
    </div>
  );
}
