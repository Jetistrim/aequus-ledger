export interface SugestaoHeuristica {
  sugestao: 'PESSOAL' | 'EMPRESA' | null;
  label: string | null;
}

/**
 * Retorna o número do dia da semana no fuso horário America/Sao_Paulo.
 * 0 = domingo, 6 = sábado — equivalente a Date.getDay() mas em horário local BRT/BRST.
 *
 * Usar Intl evita o erro de getUTCDay() onde um PIX feito na sexta às 22h BRT (01h UTC sábado)
 * seria incorretamente classificado como fim de semana.
 */
function diaSemanaLocal(data: Date): number {
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const abrev = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(data);
  return weekdayMap[abrev] ?? data.getUTCDay();
}

/**
 * Aplica heurística de valor e dia da semana para sugerir uma classificação
 * para transações PIX sem regra correspondente.
 *
 * A sugestão só é retornada quando o score vencedor for >= 2, evitando sinais fracos.
 *
 * Sinais:
 *   - Fim de semana (BRT): PESSOAL +2  "Fim de semana"
 *   - Valor < R$100:       PESSOAL +1  "Valor baixo"
 *   - Valor >= R$500 e arredondado (múltiplo de 100): EMPRESA +2  "Valor alto arredondado"
 *   - Dia útil (seg-sex):  EMPRESA +1  "Dia útil"  (desempate fraco)
 */
export function sugerirPorHeuristica(dataTransacao: Date, valorAbsoluto: number): SugestaoHeuristica {
  let pessoalScore = 0;
  let empresaScore = 0;
  const pessoalLabels: string[] = [];
  const empresaLabels: string[] = [];

  const diaSemana = diaSemanaLocal(dataTransacao);
  const fimDeSemana = diaSemana === 0 || diaSemana === 6;

  if (fimDeSemana) {
    pessoalScore += 2;
    pessoalLabels.push('Fim de semana');
  } else {
    empresaScore += 1;
    empresaLabels.push('Dia útil');
  }

  if (valorAbsoluto < 100) {
    pessoalScore += 1;
    pessoalLabels.push('Valor baixo');
  }

  if (valorAbsoluto >= 500 && valorAbsoluto % 100 === 0) {
    empresaScore += 2;
    empresaLabels.push('Valor alto arredondado');
  }

  const THRESHOLD = 2;

  if (pessoalScore >= THRESHOLD && pessoalScore > empresaScore) {
    return { sugestao: 'PESSOAL', label: pessoalLabels.join(', ') };
  }

  if (empresaScore >= THRESHOLD && empresaScore > pessoalScore) {
    return { sugestao: 'EMPRESA', label: empresaLabels.join(', ') };
  }

  return { sugestao: null, label: null };
}
