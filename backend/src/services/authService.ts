import crypto from 'crypto';

export const AUTH_COOKIE_NAME = 'cf_session';

interface AuthSession {
  usuario: string;
  expiraEm: number;
}

const sessoesAtivas = new Map<string, AuthSession>();

function normalizarBooleano(valor: string | undefined): boolean | null {
  if (typeof valor !== 'string') {
    return null;
  }

  const normalizado = valor.trim().toLowerCase();
  if (normalizado === 'true' || normalizado === '1') {
    return true;
  }

  if (normalizado === 'false' || normalizado === '0') {
    return false;
  }

  return null;
}

function limparSessoesExpiradas(): void {
  const agora = Date.now();
  for (const [token, sessao] of sessoesAtivas.entries()) {
    if (sessao.expiraEm <= agora) {
      sessoesAtivas.delete(token);
    }
  }
}

function obterHorasSessao(): number {
  const valor = Number(process.env['AUTH_SESSION_HOURS'] || 8);
  if (!Number.isFinite(valor) || valor <= 0) {
    return 8;
  }

  return valor;
}

export function autenticacaoHabilitada(): boolean {
  const valorEnv = normalizarBooleano(process.env['AUTH_ENABLED']);
  if (valorEnv !== null) {
    return valorEnv;
  }

  return process.env['NODE_ENV'] !== 'test';
}

export function validarCredenciais(usuario: string, senha: string): boolean {
  const usuarioEsperado = process.env['AUTH_USERNAME'] || 'admin';
  const senhaEsperada = process.env['AUTH_PASSWORD'] || '123456';

  return usuario === usuarioEsperado && senha === senhaEsperada;
}

export function criarSessao(usuario: string): { token: string; maxAgeMs: number } {
  limparSessoesExpiradas();

  const maxAgeMs = obterHorasSessao() * 60 * 60 * 1000;
  const token = crypto.randomBytes(32).toString('hex');

  sessoesAtivas.set(token, {
    usuario,
    expiraEm: Date.now() + maxAgeMs,
  });

  return { token, maxAgeMs };
}

export function encerrarSessao(token: string | null): void {
  if (!token) {
    return;
  }

  sessoesAtivas.delete(token);
}

export function obterSessao(token: string | null): AuthSession | null {
  if (!token) {
    return null;
  }

  limparSessoesExpiradas();

  const sessao = sessoesAtivas.get(token);
  if (!sessao) {
    return null;
  }

  return sessao;
}

export function extrairCookie(cabecalhoCookie: string | undefined, nome: string): string | null {
  if (!cabecalhoCookie) {
    return null;
  }

  const pares = cabecalhoCookie.split(';');
  for (const par of pares) {
    const [chaveBruta, ...valor] = par.split('=');
    if (!chaveBruta) {
      continue;
    }

    if (chaveBruta.trim() === nome) {
      return decodeURIComponent(valor.join('=').trim());
    }
  }

  return null;
}
