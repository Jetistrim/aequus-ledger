import { Request, Response } from 'express';

import { resolveRuntimePaths } from '../runtime/runtimePaths';
import { requestShutdown } from '../services/shutdownService';

/**
 * Dispara o desligamento do backend no runtime portátil/empacotado.
 */
export function desligarSistema(_req: Request, res: Response): void {
  const runtimePaths = resolveRuntimePaths();
  const canShutdown = runtimePaths.mode === 'portable' || runtimePaths.mode === 'packaged';

  if (!canShutdown) {
    res.status(403).json({ erro: 'Desligamento remoto disponível apenas no runtime portátil/empacotado.' });
    return;
  }

  res.status(202).json({ status: 'desligando' });

  setTimeout(() => {
    void requestShutdown().catch((error) => {
      console.error(`Falha ao desligar sistema: ${(error as Error).message}`);
    });
  }, 50);
}
