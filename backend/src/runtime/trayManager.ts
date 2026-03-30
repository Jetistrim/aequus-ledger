import fs from 'fs';
import os from 'os';
import path from 'path';
import { openBrowserToUrl } from './browserLauncher';

// ICO de 32×32 (PNG embutido no wrapper ICO para compatibilidade com Windows).
// Gerado em tempo de build a partir da identidade visual do projeto; não editar manualmente.
const ICON_ICO_BASE64 =
  'AAABAAEAICAAAAEAIAABAQAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAAgAAAAIAgGAAAAc3p6' +
  '9AAAAAFzUkdCAK7OHOkAAAAEZ0FNQQAAsY8L/GEFAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAA' +
  'lklEQVRYR2OQc1j/fyAxA7oAvfGoA0YdMOqAUQcMUgdk3Pz/6D8qONQDkz/z/xCaHAwg1B' +
  'CPMR3Q8xRs2KPVe+Fiwas/I4lBHfD05v9gdL1kYDQHQA0/cQZDIYYamjgAi+8xMQ0dAAtq' +
  '/HE5WByADsh00OCKgoFPhCCMJRTomA2hmJiCiKYOoCMedcCoA0YdMOqAUQcAAPASnOKN2A6' +
  'BAAAAAElFTkSuQmCC';

// PNG de 32×32 para macOS e Linux.
const ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARG' +
  'U1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACWSURBVFhHY5BzWP9/IDEDugC9' +
  '8agDRh0w6oBRBwxSB2Tc/P/oPyo41AOTP/P/EJocDCDUEI8xHdDzFGzYo9V74WLBqz8j' +
  'iUEd8PTm/2B0vWRgNAdADT9xBkMhhhqaOACL7zExDR0AC2r8cTlYHIAOyHTQ4IqCgU+E' +
  'IIwlFOiYDaGYmIKIpg6gIx51wKgDRh0w6oBRBwAA8BKc4o3YDoEAAAAASUVORK5CYII=';

export interface TrayOptions {
  /** URL da instância ativa, exibida no tooltip e usada pelo item "Abrir". */
  url: string;
  /** Chamado quando o usuário aciona "Encerrar" pela bandeja. */
  onShutdown: () => void;
}

/**
 * Inicia o ícone de bandeja do sistema com opções "Abrir no navegador" e "Encerrar".
 *
 * @remarks
 * A bandeja usa `systray2`, que por sua vez chama um helper binário nativo que
 * fica em `node_modules/systray2`. Em ambientes headless ou containerizados o
 * helper pode não estar disponível; nesse caso a função retorna silenciosamente,
 * deixando o servidor ativo e acessível pela URL registrada nos metadados.
 *
 * O ícone é gravado em disco no primeiro uso a partir do base64 embutido no
 * código, para não depender de caminhos externos à pasta portátil.
 *
 * Estrutura do menu (seq_id):
 * - 0 → "Abrir no navegador"
 * - 1 → separador (não clicável)
 * - 2 → "Encerrar"
 *
 * @param options - Opções de URL e callback de shutdown.
 */
export function startTray(options: TrayOptions): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let SysTrayModule: typeof import('systray2');
  try {
    SysTrayModule = require('systray2') as typeof import('systray2');
  } catch {
    console.log(
      `Bandeja do sistema não disponível neste ambiente.\n` +
      `Acesse ${options.url} no navegador ou use Ctrl+C para encerrar.`,
    );
    return;
  }

  const SysTray = SysTrayModule.default;

  const iconPath = ensureIconFile();
  if (!iconPath) {
    console.log(`Não foi possível criar o ícone da bandeja. Acesse ${options.url} no navegador.`);
    return;
  }

  try {
    const tray = new SysTray({
      menu: {
        icon: iconPath,
        title: '',
        tooltip: `Conciliação Financeira — ${options.url}`,
        items: [
          {
            title: 'Abrir no navegador',
            tooltip: options.url,
            checked: false,
            enabled: true,
          },
          SysTray.separator,
          {
            title: 'Encerrar',
            tooltip: 'Fechar a aplicação',
            checked: false,
            enabled: true,
          },
        ],
      },
      debug: false,
      copyDir: true,
    });

    tray.onReady(() => {
      // Bandeja pronta; nenhuma ação adicional necessária aqui.
    });

    tray.onClick((action) => {
      if (action.seq_id === 0) {
        openBrowserToUrl(options.url);
      } else if (action.seq_id === 2) {
        tray.kill(false);
        options.onShutdown();
      }
    });

    tray.onError((error) => {
      console.error('Erro na bandeja do sistema:', error);
    });
  } catch (error) {
    console.error('Falha ao iniciar bandeja do sistema:', (error as Error).message);
  }
}

/**
 * Garante que o arquivo de ícone exista no diretório temporário do SO
 * e retorna seu caminho absoluto. Retorna `null` em caso de falha.
 */
function ensureIconFile(): string | null {
  try {
    const iconDir = path.join(os.tmpdir(), 'conciliacao-icon');
    fs.mkdirSync(iconDir, { recursive: true });

    const isWin = process.platform === 'win32';
    const iconName = isWin ? 'icon.ico' : 'icon.png';
    const iconPath = path.join(iconDir, iconName);

    if (!fs.existsSync(iconPath)) {
      const base64 = isWin ? ICON_ICO_BASE64 : ICON_PNG_BASE64;
      fs.writeFileSync(iconPath, Buffer.from(base64, 'base64'));
    }

    return iconPath;
  } catch {
    return null;
  }
}
