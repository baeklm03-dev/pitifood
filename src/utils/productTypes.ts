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

// A product line's sizeUnit says what its size mark counts against — "16/20" is pieces per
// pound on an 'Lb' line, per kilogram on a 'kg' one. It is a grading basis only: weight is
// always kg per carton and the unit price is always quoted per kg, so nothing about the
// money or the weight follows it. Only the Size column's label does.
//
// A group that mixes both bases says so rather than picking one and hiding the other.
export function groupSizeUnitLabel(sizeUnits: Iterable<'kg' | 'Lb'>): string {
  const set = new Set(sizeUnits);
  if (set.size !== 1) return 'kg/lb';
  return set.has('Lb') ? 'lb' : 'kg';
}

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

// Built-in per-buyer commodity names, keyed by buyer code then product type. These sit
// between PRODUCT_TYPE_FULL_NAMES and the buyer's own saved overrides, so a buyer whose
// naming never changes needs no data entry, while the Buyer form can still override it.
export const BUYER_PRODUCT_TYPE_FULL_NAMES: Record<string, Record<string, string>> = {
  // AU01 SEABOSS — "Whole Cooked ... Prawn" instead of "Cooked ... Shrimp Head On Shell On".
  AU01: {
    'CHOSO A GRADE': 'Frozen Whole Cooked Vannamei Prawn " A Grade "',
    'CHOSO B GRADE': 'Frozen Whole Cooked Vannamei Prawn " B Grade "',
  },
};

// The effective name map for one buyer: built-in buyer names, with the buyer's own saved
// overrides (Buyer.productTypeNameOverrides) taking precedence. Print pages pass the
// result to getProductFullName instead of the raw override map.
export function buyerProductNames(
  buyerCode?: string,
  overrides?: Record<string, string>
): Record<string, string> {
  const builtIn = buyerCode ? BUYER_PRODUCT_TYPE_FULL_NAMES[buyerCode.toUpperCase()] : undefined;
  if (!builtIn) return overrides ?? {};
  return { ...builtIn, ...(overrides ?? {}) };
}

// Resolves a product type's printed commodity name: buyer override > default > the raw
// code itself (for custom/free-typed product types with no entry in either map).
export function getProductFullName(productType: string, overrides?: Record<string, string>): string {
  return overrides?.[productType] || PRODUCT_TYPE_FULL_NAMES[productType] || productType;
}
