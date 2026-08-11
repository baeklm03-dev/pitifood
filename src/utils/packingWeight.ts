// Parses a packing string like "8x770g" or "12 X 450 g" into net weight per
// carton, in kg (e.g. 8 x 770g = 6160g = 6.16 kg). Returns null when the string
// doesn't contain a recognizable "<units> x <grams>" pattern, so callers can
// leave the existing value alone instead of clobbering it with 0.
export function parsePackingNetWeightKg(packing: string): number | null {
  const match = packing.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const units = parseFloat(match[1]);
  const gramsPerUnit = parseFloat(match[2]);
  if (!units || !gramsPerUnit) return null;
  return (units * gramsPerUnit) / 1000;
}
