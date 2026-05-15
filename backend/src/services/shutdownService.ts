type ShutdownHandler = () => Promise<void>;

let shutdownHandler: ShutdownHandler | null = null;

/**
 * Registra o callback global de desligamento da aplicação.
 */
export function registerShutdownHandler(handler: ShutdownHandler): void {
  shutdownHandler = handler;
}

/**
 * Limpa o callback global de desligamento.
 */
export function clearShutdownHandler(): void {
  shutdownHandler = null;
}

/**
 * Solicita desligamento gracioso da aplicação, quando disponível.
 */
export async function requestShutdown(): Promise<boolean> {
  if (!shutdownHandler) {
    return false;
  }

  await shutdownHandler();
  return true;
}
