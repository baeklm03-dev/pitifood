import type { ShipmentPeriod } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PERIOD_LABEL: Record<ShipmentPeriod, string> = { early: 'Early', mid: 'Mid', late: 'Late' };

export function formatShipment(period?: ShipmentPeriod, month?: number, year?: number): string {
  if (!period || !month || !year) return '—';
  return `${PERIOD_LABEL[period]} ${MONTH_NAMES[month - 1]} ${year}`;
}

export const SHIPMENT_PERIOD_OPTIONS = [
  { value: 'early', label: 'Early' },
  { value: 'mid', label: 'Mid' },
  { value: 'late', label: 'Late' },
];

export const SHIPMENT_MONTH_OPTIONS = MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }));
