import { NextFunction, Request, Response } from 'express';
import {
  autenticacaoHabilitada,
  AUTH_COOKIE_NAME,
  extrairCookie,
  obterSessao,
} from '../services/authService';

/**
 * Exige sessão válida para rotas protegidas da API.
 */
export function exigirAutenticacao(req: Request, res: Response, next: NextFunction): void {
  if (!autenticacaoHabilitada()) {
    next();
    return;
  }

  const token = extrairCookie(req.headers.cookie, AUTH_COOKIE_NAME);
  const sessao = obterSessao(token);

  if (!sessao) {
    res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
    return;
  }

  req.authUser = sessao.usuario;
  next();
}
