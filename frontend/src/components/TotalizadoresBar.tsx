import { TotaisTransacoes } from '../types';

interface Props {
  totais: TotaisTransacoes;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function TotalizadoresBar({ totais }: Props) {
  const { pessoal, empresa, total, indefinidos } = totais;

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
