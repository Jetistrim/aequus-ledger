import { useState } from 'react';
import { logoutSistema } from '../services/api';

/**
 * Encerra a sessão do usuário atual e retorna à tela inicial autenticada.
 */
export function BotaoLogout() {
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    try {
      await logoutSistema();
    } finally {
      window.location.assign('/');
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={saindo}
      className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {saindo ? 'Saindo...' : 'Sair'}
    </button>
  );
}
