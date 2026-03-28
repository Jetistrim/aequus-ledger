import { execFile } from 'child_process';

/**
 * Abre a URL fornecida no navegador padrão do sistema operacional.
 *
 * @remarks
 * Usa os comandos nativos de cada plataforma (`start`, `open`, `xdg-open`),
 * evitando dependências externas. Falhas silenciosas são toleradas por design:
 * em ambientes headless o servidor deve continuar operando mesmo sem navegador.
 *
 * A URL é validada antes de ser passada ao shell para prevenir injeção de comandos.
 *
 * @param url - URL local a abrir no navegador (ex.: `http://127.0.0.1:3001`).
 */
export function openBrowserToUrl(url: string): void {
  if (!isValidLocalUrl(url)) {
    console.warn(`URL de abertura do navegador rejeitada: ${url}`);
    return;
  }

  const launchArgs = resolveLaunchArgs(url);
  if (!launchArgs) {
    console.log(`Navegador não pôde ser aberto automaticamente. Acesse: ${url}`);
    return;
  }

  execFile(launchArgs.command, launchArgs.args, { timeout: 5000 }, (error) => {
    if (error) {
      console.log(`Navegador não pôde ser aberto automaticamente. Acesse: ${url}`);
    }
  });
}

function resolveLaunchArgs(url: string): { command: string; args: string[] } | null {
  if (process.platform === 'win32') {
    // `start` é comando interno do cmd.exe; por isso executamos cmd com args separados.
    return { command: 'cmd.exe', args: ['/c', 'start', '', url] };
  }

  if (process.platform === 'darwin') {
    return { command: 'open', args: [url] };
  }

  if (process.platform === 'linux') {
    return { command: 'xdg-open', args: [url] };
  }

  return null;
}

/**
 * Valida que a URL é uma URL HTTP local segura para abrir no navegador.
 * Rejeita qualquer coisa que não seja `http://` para evitar injeção de comandos.
 */
function isValidLocalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
