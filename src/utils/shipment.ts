import type { ShipmentPeriod } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PERIOD_LABEL: Record<ShipmentPeriod, string> = { early: 'Early of', mid: 'Mid of', late: 'End of' };

// Some shipments are agreed only to the month, with no Early/Mid/End window — those print
// as just "September 2026" rather than falling back to a dash.
export function formatShipment(period?: ShipmentPeriod, month?: number, year?: number): string {
  if (!month || !year) return '—';
  const monthYear = `${MONTH_NAMES[month - 1]} ${year}`;
  return period ? `${PERIOD_LABEL[period]} ${monthYear}` : monthYear;
}

export const SHIPMENT_PERIOD_OPTIONS = [
  { value: 'early', label: 'Early' },
  { value: 'mid', label: 'Mid' },
  { value: 'late', label: 'End' },
];

export const SHIPMENT_MONTH_OPTIONS = MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }));
