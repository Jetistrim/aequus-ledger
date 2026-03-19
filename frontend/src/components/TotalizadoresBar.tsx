import { Transacao } from '../types';

interface Props {
  transacoes: Transacao[];
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function TotalizadoresBar({ transacoes }: Props) {
  const pessoal = transacoes
    .filter((t) => t.classificacao === 'PESSOAL')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const empresa = transacoes
    .filter((t) => t.classificacao === 'EMPRESA')
    .reduce((acc, t) => acc + Number(t.valor), 0);

  const total = pessoal + empresa;
  const indefinidos = transacoes.filter((t) => t.classificacao === 'INDEFINIDO').length;

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs text-gray-500 uppercase font-medium">Pessoal</p>
        <p className="text-lg font-bold text-green-600">{formatarMoeda(pessoal)}</p>
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs text-gray-500 uppercase font-medium">Empresa</p>
        <p className="text-lg font-bold text-blue-600">{formatarMoeda(empresa)}</p>
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs text-gray-500 uppercase font-medium">Total</p>
        <p className="text-lg font-bold text-gray-800">{formatarMoeda(total)}</p>
      </div>
      <div className="flex-1 min-w-[140px]">
        <p className="text-xs text-gray-500 uppercase font-medium">Indefinidos</p>
        <p className={`text-lg font-bold ${indefinidos > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {indefinidos}
        </p>
      </div>
    </div>
  );
}
