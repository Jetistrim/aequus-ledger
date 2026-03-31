/**
 * Utilitários para serializar e dessersializar parâmetros de consulta da URL.
 * Centraliza lógica de validação e defaults para evitar duplicação.
 */

export interface FiltrosListagem {
  pagina: number;
  limite: number;
  filtro: 'todos' | 'indefinidos';
  classificacao: 'TODAS' | 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';
  tipo: 'TODOS' | 'ENTRADA' | 'SAIDA';
  busca: string;
}

const VALORES_PADRAO: FiltrosListagem = {
  pagina: 1,
  limite: 25,
  filtro: 'todos',
  classificacao: 'TODAS',
  tipo: 'TODOS',
  busca: '',
};

const LIMITES_VALIDOS = [25, 50, 100];

/**
 * Converte SearchParams da URL para objeto tipado FiltrosListagem.
 * Aplica defaults seguros para valores inválidos.
 */
export function parseUrlFiltros(searchParams: URLSearchParams): FiltrosListagem {
  // Pagina: inteiro positivo, fallback 1
  const paginaRaw = searchParams.get('pagina')?.trim() || '';
  const pagina = Number.isFinite(Number(paginaRaw)) && Number(paginaRaw) > 0 
    ? Math.floor(Number(paginaRaw))
    : VALORES_PADRAO.pagina;

  // Limite: validar contra lista permitida, fallback 25
  const limiteRaw = searchParams.get('limite')?.trim() || '';
  const limiteNum = Number(limiteRaw);
  const limite = LIMITES_VALIDOS.includes(limiteNum) 
    ? limiteNum 
    : VALORES_PADRAO.limite;

  // Filtro rápido: enum validado
  const filtroRaw = searchParams.get('filtro')?.trim() || '';
  const filtro = (filtroRaw === 'indefinidos' ? 'indefinidos' : 'todos') as 'todos' | 'indefinidos';

  // Classificação: enum validado
  const classificacaoRaw = searchParams.get('classificacao')?.trim().toUpperCase() || '';
  const classificacao = (['PESSOAL', 'EMPRESA', 'INDEFINIDO'].includes(classificacaoRaw)
    ? classificacaoRaw
    : 'TODAS') as 'TODAS' | 'PESSOAL' | 'EMPRESA' | 'INDEFINIDO';

  // Tipo: enum validado
  const tipoRaw = searchParams.get('tipo')?.trim().toUpperCase() || '';
  const tipo = (['ENTRADA', 'SAIDA'].includes(tipoRaw)
    ? tipoRaw
    : 'TODOS') as 'TODOS' | 'ENTRADA' | 'SAIDA';

  // Busca: string simples com trim
  const busca = searchParams.get('busca')?.trim() || '';

  return { pagina, limite, filtro, classificacao, tipo, busca };
}

/**
 * Converte objeto FiltrosListagem para query string parametrizada.
 * Omite valores iguais aos defaults para manter URL concisa.
 */
export function serializarFiltros(filtros: FiltrosListagem): URLSearchParams {
  const params = new URLSearchParams();

  if (filtros.pagina !== VALORES_PADRAO.pagina) {
    params.append('pagina', String(filtros.pagina));
  }
  if (filtros.limite !== VALORES_PADRAO.limite) {
    params.append('limite', String(filtros.limite));
  }
  if (filtros.filtro !== VALORES_PADRAO.filtro) {
    params.append('filtro', filtros.filtro);
  }
  if (filtros.classificacao !== VALORES_PADRAO.classificacao) {
    params.append('classificacao', filtros.classificacao);
  }
  if (filtros.tipo !== VALORES_PADRAO.tipo) {
    params.append('tipo', filtros.tipo);
  }
  if (filtros.busca !== VALORES_PADRAO.busca) {
    params.append('busca', filtros.busca);
  }

  return params;
}

/**
 * Hook alternativo simples: extrai apenas certos parâmetros após validação.
 * Se você preferir um subset (ex.: só pagina/limite), use isto.
 */
export function obterFiltrosPadroes(): FiltrosListagem {
  return { ...VALORES_PADRAO };
}
