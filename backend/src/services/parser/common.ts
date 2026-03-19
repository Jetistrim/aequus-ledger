import iconv from 'iconv-lite';
import { ColunasTransacao } from './types';

export function parseValor(valorOriginal: unknown): number | null {
  if (typeof valorOriginal === 'number') {
    return Number.isFinite(valorOriginal) ? valorOriginal : null;
  }

  const texto = String(valorOriginal ?? '').trim();
  if (!texto) return null;

  const normalizado = texto
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');

  const valor = Number.parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

export function parseDataGenerica(valor: unknown): Date | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    // Numero de serie de data do Excel (base 1899-12-30).
    const excelEpochUtc = Date.UTC(1899, 11, 30);
    const data = new Date(excelEpochUtc + valor * 24 * 60 * 60 * 1000);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const texto = String(valor ?? '').trim();
  if (!texto) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [d, m, y] = texto.split('/');
    const data = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function normalizarChave(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function localizarColunasTransacao(row: Record<string, unknown>): ColunasTransacao {
  const keys = Object.keys(row);

  return {
    dataKey: keys.find((k) => /data|date|dt/.test(normalizarChave(k))),
    valorKey: keys.find((k) => /valor|value|amount|quantia|vl|trnamt/.test(normalizarChave(k))),
    descKey: keys.find((k) =>
      /descr|memo|hist|historico|narr|name|lancamento|transacao/.test(normalizarChave(k))
    ),
    creditoKey: keys.find((k) => /credito|credit|entrada|recebimento/.test(normalizarChave(k))),
    debitoKey: keys.find((k) => /debito|debit|saida|pagamento/.test(normalizarChave(k))),
  };
}

export function extrairValorLinha(row: Record<string, unknown>, colunas: ColunasTransacao): number | null {
  if (colunas.valorKey) {
    const valor = parseValor(row[colunas.valorKey]);
    if (valor !== null && valor !== 0) {
      return valor;
    }
  }

  const credito = colunas.creditoKey ? parseValor(row[colunas.creditoKey]) : null;
  const debito = colunas.debitoKey ? parseValor(row[colunas.debitoKey]) : null;

  if (credito === null && debito === null) {
    return null;
  }

  if ((credito ?? 0) === 0 && (debito ?? 0) === 0) {
    return null;
  }

  if ((credito ?? 0) !== 0 && (debito ?? 0) === 0) {
    return credito;
  }

  if ((debito ?? 0) !== 0 && (credito ?? 0) === 0) {
    return (debito as number) > 0 ? -(debito as number) : debito;
  }

  const creditoNum = credito as number;
  const debitoNum = debito as number;
  const creditoAjustado = creditoNum >= 0 ? creditoNum : Math.abs(creditoNum);
  const debitoAjustado = debitoNum <= 0 ? debitoNum : -debitoNum;
  const combinado = creditoAjustado + debitoAjustado;

  return combinado === 0 ? null : combinado;
}

export function detectarSeparador(amostra: string): string {
  const semicolons = (amostra.match(/;/g) || []).length;
  const commas = (amostra.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

export function decodificarBuffer(buffer: Buffer): string {
  try {
    const texto = iconv.decode(buffer, 'utf-8');
    if (texto.includes('\ufffd')) {
      return iconv.decode(buffer, 'latin1');
    }
    return texto;
  } catch {
    return iconv.decode(buffer, 'latin1');
  }
}
