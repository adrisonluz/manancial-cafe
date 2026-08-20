export function formatCurrencyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

export function formatCurrency(value: number): string {
  return `R$ ${formatCurrencyValue(value)}`;
}

export function maskCurrencyInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  const cents = parseInt(digits || '0', 10);
  return formatCurrencyValue(cents / 100);
}

export function parseCurrencyInput(text: string): number {
  return parseFloat(text.replace(',', '.')) || 0;
}
