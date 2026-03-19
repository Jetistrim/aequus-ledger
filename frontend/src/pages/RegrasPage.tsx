import { PainelRegras } from '../components/PainelRegras';

export function RegrasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">💰 Conciliação Financeira</h1>
          <a
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Voltar à Conciliação
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <PainelRegras />
      </main>
    </div>
  );
}
