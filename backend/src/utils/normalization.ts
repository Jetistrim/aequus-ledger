export interface NormalizacaoOptions {
  removerStopwordsBancarias?: boolean;
}

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/g;
const MULTI_SPACE_REGEX = /\s+/g;
const DANGEROUS_CSV_PREFIX_REGEX = /^[\s\t]*[=+\-@]/;

const STOPWORDS_FRASES = [
  'DEBITO AUTOMATICO',
  'ESTORNO DE',
  'PAGAMENTO PIX',
  'TRANSFERENCIA PIX',
  'TRANSF PIX',
  'REC PIX',
  'PIX RECEBIDO',
  'PIX ENVIADO',
  'PIX SAQUE',
  'PIX ESTORNO',
  'QR CODE',
  'CHAVE PIX',
  'CHAVE ALEATORIA',
  'CHAVE CPF',
  'CHAVE EMAIL',
  'PAGAMENTO VIA PIX',
  'RECEBIMENTO VIA PIX',
] as const;

const STOPWORDS_BANCARIAS = new Set([
  'PAGAMENTO',
  'PAG',
  'PGTO',
  'PAGTO',
  'COMPRA',
  'DEBITO',
  'CREDITO',
  'TRANSFERENCIA',
  'TRANSF',
  'PIX',
  'TED',
  'DOC',
  'SAQUE',
  'ESTORNO',
  'CANCELAMENTO',
  'CANC',
  'BOLETO',
  'BOLE',
  'FATURA',
  'FAT',
  'RECORRENTE',
  'LANCTO',
  'LANCAMENTO',
  'DEB',
  'CRED',
  'PARC',
  'PARCELA',
  'RECARGA',
  'REC',
  'CELULAR',
  'TARIFA',
  'IOF',
  'MANUTENCAO',
  'MANUT',
  'ANUIDADE',
  'AUTOMATICO',
  'AUTO',
  'EMPRESA',
  'LTDA',
  'ME',
  'EPP',
  'SA',
  'CC',
  'CARTAO',
  'XXXX',
]);

export function sanitizeTextInput(value: unknown): string {
  let s = String(value ?? '');
  s = s.replace(CONTROL_CHARS_REGEX, ' ');
  s = s.replace(/\t/g, ' ');
  s = s.normalize('NFKC');
  s = s.replace(MULTI_SPACE_REGEX, ' ').trim();
  return s;
}

export function normalizeForMatching(value: unknown, options: NormalizacaoOptions = {}): string {
  const { removerStopwordsBancarias = true } = options;

  let s = sanitizeTextInput(value);

  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.toUpperCase();
  s = s.replace(/[^A-Z0-9\s*\-/]/g, ' ');
  s = s.replace(MULTI_SPACE_REGEX, ' ').trim();

  if (removerStopwordsBancarias && s) {
    for (const frase of STOPWORDS_FRASES) {
      const regex = new RegExp(`\\b${frase}\\b`, 'g');
      s = s.replace(regex, ' ');
    }

    const tokens = s
      .split(' ')
      .filter(Boolean)
      .filter((token) => !STOPWORDS_BANCARIAS.has(token));

    s = tokens.join(' ');
  }

  return s.replace(MULTI_SPACE_REGEX, ' ').trim();
}

export function protectCsvFormula(value: unknown): string {
  const s = sanitizeTextInput(value);
  return DANGEROUS_CSV_PREFIX_REGEX.test(s) ? `'${s}` : s;
}
