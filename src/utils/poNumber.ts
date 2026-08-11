import type { ProductionOrder } from '../types';

/**
 * PO number runs sequentially per calendar year: "001/2026", "002/2026", ...
 * resetting back to 001 each new year. `allPOs` should be every PO in the system
 * (not just those for one contract) so the sequence is global.
 */
export function generatePoNo(allPOs: ProductionOrder[], year: number = new Date().getFullYear()): string {
  const sameYear = allPOs.filter((po) => po.poNo.endsWith(`/${year}`));
  const next = (sameYear.length + 1).toString().padStart(3, '0');
  return `${next}/${year}`;
}
