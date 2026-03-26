import { useState } from 'react';

interface Props {
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  confirmandoLabel?: string;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}

/**
 * Modal simples de confirmação para ações destrutivas.
 */
export function ModalConfirmacao({
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  confirmandoLabel = 'Processando...',
  onCancelar,
  onConfirmar,
}: Props) {
  const [confirmando, setConfirmando] = useState(false);

  async function handleConfirmar() {
    try {
      setConfirmando(true);
      await onConfirmar();
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-gray-800">{titulo}</h2>
        <p className="mb-6 text-sm text-gray-600">{mensagem}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            disabled={confirmando}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {confirmando ? confirmandoLabel : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
