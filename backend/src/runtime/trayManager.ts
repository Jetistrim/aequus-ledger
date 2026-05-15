export interface TrayOptions {
  /** URL da instância ativa, exibida em log para facilitar abertura manual. */
  url: string;
  /** Mantido por compatibilidade com a API anterior. */
  onShutdown: () => void;
}

/**
 * Implementação no-op para manter o runtime portátil sem dependências nativas.
 */
export function startTray(options: TrayOptions): void {
  console.log(
    `Bandeja desativada neste build. Acesse ${options.url} no navegador e use o botão "Desligar Sistema" para encerrar.`,
  );
}
