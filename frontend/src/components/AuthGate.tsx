import { ReactNode, useEffect, useState } from 'react';
import { formatApiErrorMessage, verificarSessao } from '../services/api';
import { LoginPage } from './LoginPage';

interface AuthGateProps {
  children: ReactNode;
}

type EstadoAuth = 'validando' | 'autenticado' | 'nao-autenticado';

/**
 * Garante que somente usuários autenticados visualizem as telas da aplicação.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [estado, setEstado] = useState<EstadoAuth>('validando');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function validarSessaoInicial() {
      try {
        const sessao = await verificarSessao();
        if (!ativo) {
          return;
        }

        setEstado(sessao.autenticado ? 'autenticado' : 'nao-autenticado');
      } catch (error) {
        if (!ativo) {
          return;
        }

        setErro(formatApiErrorMessage(error, 'Não foi possível validar a sessão.'));
        setEstado('nao-autenticado');
      }
    }

    void validarSessaoInicial();

    return () => {
      ativo = false;
    };
  }, []);

  if (estado === 'validando') {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">Validando sessão...</p>
          </div>
        </div>
      </div>
    );
  }

  if (estado === 'nao-autenticado') {
    return (
      <LoginPage
        mensagemInicial={erro}
        onLoginSucesso={() => {
          setErro(null);
          setEstado('autenticado');
        }}
      />
    );
  }

  return <>{children}</>;
}
