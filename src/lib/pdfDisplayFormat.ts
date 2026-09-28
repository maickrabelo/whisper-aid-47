const LOWERCASE_WORDS = new Set([
  'a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'para', 'por',
]);

const UPPERCASE_TERMS = new Set([
  'CIPA', 'CNAE', 'CNPJ', 'CPF', 'CEP', 'GHE', 'INSS', 'NR', 'PGR', 'PGRTR', 'RH', 'SESMT', 'SMS', 'SST', 'TI',
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

function formatUppercaseWord(word: string, index: number): string {
  const upper = word.toLocaleUpperCase('pt-BR');
  const lower = word.toLocaleLowerCase('pt-BR');
  if (UPPERCASE_TERMS.has(upper)) return upper;
  if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;
  return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
}

/** Normaliza textos cadastrados integralmente em caixa alta sem alterar textos já revisados. */
export function formatPdfProperCase(value: unknown): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const letters = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || [];
  const uppercaseLetters = letters.filter(letter => letter === letter.toLocaleUpperCase('pt-BR')).length;
  if (letters.length === 0 || uppercaseLetters / letters.length < 0.8) return text;

  let wordIndex = 0;
  return text.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g, word => {
    const formatted = formatUppercaseWord(word, wordIndex);
    wordIndex += 1;
    return formatted;
  });
}

export const formatPdfSector = formatPdfProperCase;
export const formatPdfAddress = formatPdfProperCase;