interface Props {
  totalIndefinidos: number;
  filtro: 'todos' | 'indefinidos';
  onFiltroChange: (filtro: 'todos' | 'indefinidos') => void;
}

export function FiltroRapido({ totalIndefinidos, filtro, onFiltroChange }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onFiltroChange('todos')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          filtro === 'todos'
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Ver Tudo
      </button>
      <button
        onClick={() => onFiltroChange('indefinidos')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          filtro === 'indefinidos'
            ? 'bg-red-600 text-white'
            : 'bg-red-50 text-red-600 hover:bg-red-100'
        }`}
      >
        Ver Indefinidos ({totalIndefinidos})
      </button>
    </div>
  );
}
