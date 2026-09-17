export const DEFAULT_CURRENCY = 'USD';

export const CURRENCIES = ['USD', 'CNY', 'THB', 'EUR', 'GBP', 'JPY', 'HKD'] as const;

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

export function fmtMoney(n: number, currency = DEFAULT_CURRENCY): string {
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
