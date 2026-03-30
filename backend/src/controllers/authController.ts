import { Request, Response } from 'express';
import {
  autenticacaoHabilitada,
  AUTH_COOKIE_NAME,
  criarSessao,
  encerrarSessao,
  extrairCookie,
  obterSessao,
  validarCredenciais,
} from '../services/authService';

interface LoginBody {
  usuario?: unknown;
  senha?: unknown;
}

function opcoesCookieAuth(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function login(req: Request<unknown, unknown, LoginBody>, res: Response): void {
  if (!autenticacaoHabilitada()) {
    res.status(200).json({ autenticado: true, usuario: 'modo-teste', autenticacaoHabilitada: false });
    return;
  }

  const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

  if (!usuario || !senha) {
    res.status(400).json({ erro: 'Informe usuário e senha.' });
    return;
  }

  if (!validarCredenciais(usuario, senha)) {
    res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
    return;
  }

  const { token, maxAgeMs } = criarSessao(usuario);
  res.cookie(AUTH_COOKIE_NAME, token, opcoesCookieAuth(maxAgeMs));
  res.status(200).json({ autenticado: true, usuario, autenticacaoHabilitada: true });
}

export function me(req: Request, res: Response): void {
  if (!autenticacaoHabilitada()) {
    res.status(200).json({ autenticado: true, usuario: 'modo-teste', autenticacaoHabilitada: false });
    return;
  }

  const token = extrairCookie(req.headers.cookie, AUTH_COOKIE_NAME);
  const sessao = obterSessao(token);

  if (!sessao) {
    res.status(401).json({ autenticado: false });
    return;
  }

  res.status(200).json({ autenticado: true, usuario: sessao.usuario, autenticacaoHabilitada: true });
}

export function logout(req: Request, res: Response): void {
  if (autenticacaoHabilitada()) {
    const token = extrairCookie(req.headers.cookie, AUTH_COOKIE_NAME);
    encerrarSessao(token);
  }

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
  });
  res.status(200).json({ logout: true });
}
