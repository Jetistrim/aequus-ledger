import { useState } from 'react';

import { backendEstaOnline, desligarSistema, formatApiErrorMessage } from '../services/api';
import { ModalConfirmacao } from './ModalConfirmacao';

const POLLING_INTERVAL_MS = 700;
const TIMEOUT_DESLIGAMENTO_MS = 20_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Ação para encerrar o backend portátil/empacotado pela interface web.
 */
export function BotaoDesligarSistema() {
  const [modalAberto, setModalAberto] = useState(false);
  const [desligando, setDesligando] = useState(false);
  const [sistemaDesligado, setSistemaDesligado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aguardarBackendEncerrar(): Promise<boolean> {
    const deadline = Date.now() + TIMEOUT_DESLIGAMENTO_MS;

    while (Date.now() <= deadline) {
      const online = await backendEstaOnline();
      if (!online) {
        return true;
      }
      await wait(POLLING_INTERVAL_MS);
    }

    return false;
  }

  async function handleConfirmarDesligamento(): Promise<void> {
    setErro(null);
    setModalAberto(false);
    setDesligando(true);

    try {
      await desligarSistema();
      const backendEncerrado = await aguardarBackendEncerrar();

      if (!backendEncerrado) {
        setErro('Não foi possível confirmar o desligamento. Atualize a página para verificar o status.');
        return;
      }

      setSistemaDesligado(true);
    } catch (error) {
      setErro(formatApiErrorMessage(error, 'Erro ao desligar sistema.'));
    } finally {
      setDesligando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        disabled={desligando || sistemaDesligado}
        className="text-sm text-red-700 hover:text-red-800 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {desligando ? 'Desligando sistema...' : sistemaDesligado ? 'Sistema desligado' : 'Desligar Sistema'}
      </button>

      {desligando && (
        <span className="text-xs text-amber-700">Aguardando confirmação do encerramento...</span>
      )}

      {sistemaDesligado && (
        <span className="text-xs text-emerald-700">Sistema desligado. Abra novamente pelo atalho.</span>
      )}

      {erro && (
        <span className="text-xs text-red-600">{erro}</span>
      )}

      {modalAberto && (
        <ModalConfirmacao
          titulo="Desligar sistema"
          mensagem="Isso encerrará o backend nesta máquina. Deseja continuar?"
          rotuloConfirmar="Desligar"
          confirmandoLabel="Desligando..."
          onCancelar={() => setModalAberto(false)}
          onConfirmar={handleConfirmarDesligamento}
        />
      )}
    </div>
  );
}
