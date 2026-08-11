import { TH_MONTH_NAMES } from './thaiDate';

/**
 * Builds the Thai "กำหนดส่งมอบ" sentence for a PO from the source contract's
 * container + shipment fields, e.g. "จำนวน 1 x 40FCL กำหนดส่งมอบภายในเดือนกรกฎาคม 2026".
 */
export function formatDeliveryNoteTH(
  containerQty?: number,
  containerType?: string,
  shipmentMonth?: number,
  shipmentYear?: number
): string {
  const parts: string[] = [];

  if (containerQty && containerType) {
    parts.push(`จำนวน ${containerQty} x ${containerType}`);
  }

  if (shipmentMonth && shipmentYear) {
    parts.push(`กำหนดส่งมอบภายในเดือน${TH_MONTH_NAMES[shipmentMonth - 1]} ${shipmentYear}`);
  }

  return parts.join(' ');
}
