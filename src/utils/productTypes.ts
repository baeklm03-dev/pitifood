// Shared product type + size constants used by ContractForm and BrandForm.

export const PRODUCT_TYPES = [
  'CHOSO A GRADE', 'CHOSO B GRADE', 'CHOSO SCAR', 'CHOSO (WHITE CHEEK)',
  'RHOSO', 'RHOSO (SOFT SHELL)', 'RAW VANNAMEI PD',
];

export const SIZES = [
  'U8', 'U10', '10/15', '13/15', '16/20', '15/25', '21/25', '20/30', '21/30', '26/30',
  '31/35', '30/40', '31/40', '36/40', '40/50', '41/50', '50/60', '51/60', '60/70',
  '61/70', '70/80', '71/80', '81/100', '91/120',
];

// PO "size r/m" (pieces-per-lb range) derived from a "size mark" like "16/20":
// one step inside each end of the range, i.e. (low+1)-(high-1) → "17-19".
// Non-range marks (U8, blank, custom text) yield '' so the user can type it in.
export function sizeRmFromMark(mark: string): string {
  const m = mark.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return '';
  const lo = parseInt(m[1], 10) + 1;
  const hi = parseInt(m[2], 10) - 1;
  if (lo > hi) return '';
  return lo === hi ? String(lo) : `${lo}-${hi}`;
}

// Default commodity description printed on Sale Contracts / POs for each product type.
// A buyer can override any of these (Buyer.productTypeNameOverrides) — e.g. AU01 SEABOSS
// calls its product "Prawn" instead of "Shrimp".
export const PRODUCT_TYPE_FULL_NAMES: Record<string, string> = {
  'CHOSO A GRADE': 'Frozen Cooked Vannamei Shrimp Head On Shell On',
  'CHOSO B GRADE': 'Frozen Cooked Vannamei Shrimp Head On Shell On " B Grade "',
  'CHOSO SCAR': 'Frozen Cooked Vannamei Shrimp Head On Shell On (Scar)',
  'CHOSO (WHITE CHEEK)': 'Frozen Cooked Vannamei Shrimp Head On Shell On " White Cheek "',
  'RHOSO': 'Frozen Raw Vannamei Shrimp Head On Shell On',
  'RHOSO (SOFT SHELL)': 'Frozen Raw Vannamei Shrimp Head On Shell On - Soft Shell',
  'RAW VANNAMEI PD': 'Frozen Raw Vannamei Shrimp Peeled Deveined Tail Off (Raw PD)',
};

// Resolves a product type's printed commodity name: buyer override > default > the raw
// code itself (for custom/free-typed product types with no entry in either map).
export function getProductFullName(productType: string, overrides?: Record<string, string>): string {
  return overrides?.[productType] || PRODUCT_TYPE_FULL_NAMES[productType] || productType;
}
