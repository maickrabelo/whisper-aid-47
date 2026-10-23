export const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
export const xmlEscape = (value: unknown): string => {
  const text = String(value ?? '');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) throw new Error('Texto contém caracteres incompatíveis com XML.');
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return text.replace(/[&<>"']/g, c => entities[c] ?? c);
};
export const normalizeRegistration = (value: string): string => value.toUpperCase().replace(/[.\/\-\s]/g, '');
export function validCpf(value: string): boolean {
  const cpf = value.replace(/[.\-\s]/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const length of [9, 10]) {
    const sum = [...cpf.slice(0, length)].reduce((total, n, i) => total + Number(n) * (length + 1 - i), 0);
    const remainder = sum % 11;
    if (Number(cpf[length]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}
/** Numeric and alphanumeric CNPJ use the official ASCII-minus-48 check digit rule. */
export function validCnpj(value: string): boolean {
  const cnpj = normalizeRegistration(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  for (const length of [12, 13]) {
    const weights = length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = [...cnpj.slice(0, length)].reduce((total, c, i) => total + (c.charCodeAt(0) - 48) * (weights[i] ?? 0), 0);
    const remainder = sum % 11;
    if (Number(cnpj[length]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
  }
  return true;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function eventId(cnpj: string, date: Date, sequence: number): string {
  const registration = normalizeRegistration(cnpj);
  if (!validCnpj(registration) || !Number.isInteger(sequence) || sequence < 1 || sequence > 9999999) throw new Error('Identificação do evento inválida.');
  const timestamp = date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `ID1${registration.slice(0, 8).padEnd(12, '0')}${timestamp}${String(sequence).padStart(7, '0')}`;
}