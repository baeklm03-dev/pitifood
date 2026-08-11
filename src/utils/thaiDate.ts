export const TH_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Formats an ISO date string as "10 กรกฎาคม 2026" (Thai month name, Gregorian year). */
export function formatDateTH(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${TH_MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
