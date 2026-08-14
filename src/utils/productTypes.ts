// Shared product type + size constants used by ContractForm and BrandForm.

export const PRODUCT_TYPES = [
  'CHOSO A GRADE', 'CHOSO B GRADE', 'CHOSO SCAR', 'CHOSO (WHITE CHEEK)',
  'RHOSO', 'RHOSO (SOFT SHELL)', 'RAW VANNAMEI PD',
];

export const SIZES = [
  '13/15', '16/20', '21/25', '26/30', '70/30', '31/35', '30/40',
  '41/50', '51/60', '61/70', '71/80', '81/100', '91/120',
];

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
