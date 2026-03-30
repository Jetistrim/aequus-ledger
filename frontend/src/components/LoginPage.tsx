import { FormEvent, useState } from 'react';
import { formatApiErrorMessage, loginSistema } from '../services/api';

interface LoginPageProps {
  mensagemInicial?: string | null;
  onLoginSucesso: () => void;
}

/**
 * Tela de login mínima para bloquear acesso não autorizado ao sistema.
 */
export function LoginPage({ mensagemInicial, onLoginSucesso }: LoginPageProps) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(mensagemInicial || null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const sessao = await loginSistema(usuario.trim(), senha);
      if (!sessao.autenticado) {
        setErro('Usuário ou senha inválidos.');
        return;
      }

      onLoginSucesso();
    } catch (error) {
      setErro(formatApiErrorMessage(error, 'Não foi possível autenticar agora.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200 px-4 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-800">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-600">
            Faça login para visualizar dados de conciliação e faturamento.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Usuário</span>
              <input
                type="text"
                autoComplete="username"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="Seu usuário"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="Sua senha"
                required
              />
            </label>

            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
