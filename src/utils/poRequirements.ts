import type { ProductSpecDetail, PackingDetail, LoadingRequirement, DocumentRequirement, RequirementItem } from '../types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyProductSpec(): ProductSpecDetail {
  return {
    standard: '', color: '',
    netWeightGrams: '', boxWeightGrams: '', afterGlazeWeightGrams: '',
    glazePercent: '', glazeMethod: '',
    extraItems: [],
  };
}

export function emptyPackingDetail(): PackingDetail {
  return {
    innerBoxWidthMm: '', innerBoxLengthMm: '', innerBoxHeightMm: '', innerBoxCode: '',
    topLidChecklist: '', topLidStampCode: '', topLidStampDate: false,
    bottomLidType: 'blank', bottomLidDetail: '',
    outerBoxWidthMm: '', outerBoxLengthMm: '', outerBoxHeightMm: '', outerBoxCode: '',
    outerBoxChecklist: '', outerBoxStampCode: '', outerBoxDateMatchInner: false,
    strapped: false, strappingColor: '', strappingStyle: '',
    extraItems: [],
  };
}

export function emptyLoadingRequirement(): LoadingRequirement {
  return [];
}

export function emptyDocumentRequirement(): DocumentRequirement {
  return [];
}

// Starting template for a brand-new Buyer — today's boilerplate lines, unchecked, so admins
// don't retype the common items from scratch. Purely a seed; freely edited from there.
export function defaultLoadingItems(): LoadingRequirement {
  return [
    { id: uid(), checked: false, text: 'กำหนดใส่ Temperature Recorder ในตู้สินค้า (ให้ระบุหมายเลขอุณหภูมิใน B/L และใน packing list)' },
  ];
}

export function defaultDocumentItems(): DocumentRequirement {
  return [
    { id: uid(), checked: false, text: 'ภาพถ่ายกล่องอินเนอร์ และลูกฟูก เมื่อกล่องมาถึงโรงงาน' },
    { id: uid(), checked: false, text: 'จัดทำ Finished Product Inspection Report ตามแบบฟอร์มที่ลูกค้ากำหนด' },
    { id: uid(), checked: false, text: 'จัดทำรายงานการโหลด ระบุรายละเอียด รายการสินค้า, วันหมดอายุ, lot number, ภาพถ่ายสินค้าระหว่างโหลด และตำแหน่ง' },
  ];
}

// Backward-compat adapter — accepts either the new array shape or the old fixed-object shape
// (still sitting in existing Buyer/PO rows) and normalizes both into RequirementItem[], so no
// SQL data migration is needed; old rows upgrade in place the next time they're saved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRequirementItems(raw: any): RequirementItem[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      id: typeof item?.id === 'string' ? item.id : uid(),
      text: typeof item?.text === 'string' ? item.text : '',
      checked: Boolean(item?.checked),
    }));
  }
  if (raw && typeof raw === 'object') {
    if ('temperatureRecorder' in raw) {
      return defaultLoadingItems().map((item) => ({ ...item, checked: Boolean(raw.temperatureRecorder) }));
    }
    if ('photoInnerBoxCorrugated' in raw || 'inspectionReport' in raw || 'loadingReport' in raw) {
      const [photo, inspection, loading] = defaultDocumentItems();
      return [
        { ...photo, checked: Boolean(raw.photoInnerBoxCorrugated) },
        { ...inspection, checked: Boolean(raw.inspectionReport) },
        { ...loading, checked: Boolean(raw.loadingReport) },
      ];
    }
  }
  return [];
}

// Used when a PO copies a buyer's default checklist — fresh ids so editing the PO's copy
// never mutates the buyer's stored array by reference.
export function cloneRequirementItems(items: RequirementItem[]): RequirementItem[] {
  return items.map((item) => ({ ...item, id: uid() }));
}

// Formats each section's structured fields as flowing text lines, skipping fields that
// were never filled in — used by both the PO print layout and the Brand/Buyer read-only
// view pages so the two never drift apart.

// Numbers a list of raw (unnumbered) lines as "{prefix}.1", "{prefix}.2", ... and appends any
// checked custom extra items, continuing the same numbering — real POs always show explicit
// sub-item numbers (1.1/1.2/2.1/2.2...), never bare flowing text.
function numberLines(rawLines: string[], extraItems: RequirementItem[] | undefined, prefix: string): string[] {
  const extra = (extraItems ?? []).filter((item) => item.checked && item.text.trim()).map((item) => item.text.trim());
  return [...rawLines, ...extra].map((line, i) => `${prefix}.${i + 1} ${line}`);
}

export function formatProductSpecLines(v: ProductSpecDetail, prefix: string): string[] {
  const lines: string[] = [];
  if (v.standard) lines.push(`มาตรฐาน: ${v.standard}`);
  if (v.color) lines.push(`สี: ${v.color}`);
  if (v.netWeightGrams || v.boxWeightGrams || v.afterGlazeWeightGrams || v.glazePercent || v.glazeMethod) {
    const parts = [
      v.netWeightGrams && `N.W. ${v.netWeightGrams}g`,
      v.boxWeightGrams && `ระบุบนกล่อง ${v.boxWeightGrams}g`,
      v.afterGlazeWeightGrams && `หลังเคลือบน้ำ ${v.afterGlazeWeightGrams}`,
      v.glazePercent && `เคลือบน้ำ ${v.glazePercent}%`,
      v.glazeMethod && `วิธีการเคลือบ ${v.glazeMethod}`,
    ].filter(Boolean);
    lines.push(`น้ำหนักและการเคลือบน้ำ: ${parts.join(' / ')}`);
  }
  return numberLines(lines, v.extraItems, prefix);
}

// Shared by the PackingDetailFields live preview and formatPackingDetailLines below, so the
// form preview and the printed line can never drift out of sync.
export interface BoxLineContext { productType: string; brand: string; netWeightGrams: string; }

export function composeInnerBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.innerBoxWidthMm || '-'}x${v.innerBoxLengthMm || '-'}x${v.innerBoxHeightMm || '-'}`;
  return `อินเนอร์${ctx.productType}${ctx.brand ? ` (${ctx.brand})` : ''} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.innerBoxCode || '-'}`;
}

export function composeOuterBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.outerBoxWidthMm || '-'}x${v.outerBoxLengthMm || '-'}x${v.outerBoxHeightMm || '-'}`;
  return `กล่องนอก${ctx.productType}${ctx.brand ? ` ${ctx.brand}` : ''} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.outerBoxCode || '-'}`;
}

export function formatPackingDetailLines(v: PackingDetail, prefix: string, ctx: BoxLineContext): string[] {
  const lines: string[] = [];
  if (v.innerBoxWidthMm || v.innerBoxLengthMm || v.innerBoxHeightMm || v.innerBoxCode) {
    lines.push(composeInnerBoxLine(v, ctx));
  }
  if (v.topLidChecklist || v.topLidStampCode || v.topLidStampDate) {
    const parts = [
      v.topLidChecklist && `กาเครื่องหมายถูกต้องที่ช่อง: ${v.topLidChecklist}`,
      v.topLidStampCode && `stamp code ${v.topLidStampCode}`,
      v.topLidStampDate && 'stamp Production date : YYYY.MM.DD',
    ].filter(Boolean);
    lines.push(`ฝาบน: ${parts.join(' / ')}`);
  }
  lines.push(`ฝาล่าง: ${v.bottomLidType === 'printed' ? `พิมพ์ระบุ${v.bottomLidDetail ? ` ${v.bottomLidDetail}` : ''}` : 'ไม่มีข้อความใดๆ'}`);
  if (v.outerBoxWidthMm || v.outerBoxLengthMm || v.outerBoxHeightMm || v.outerBoxCode) {
    lines.push(composeOuterBoxLine(v, ctx));
  }
  if (v.outerBoxChecklist || v.outerBoxStampCode || v.outerBoxDateMatchInner) {
    const parts = [
      v.outerBoxChecklist && `กาเครื่องหมายถูกต้องที่ช่อง: ${v.outerBoxChecklist}`,
      v.outerBoxStampCode && `stamp code ${v.outerBoxStampCode}`,
      v.outerBoxDateMatchInner && 'วันผลิตและวันหมดอายุตรงกับกล่องอินเนอร์',
    ].filter(Boolean);
    lines.push(`กล่องนอก (ต่อ): ${parts.join(' / ')}`);
  }
  lines.push(`เชือกสายรัด: ${v.strapped ? `รัด สี ${v.strappingColor || '-'} ลักษณะ ${v.strappingStyle || '-'}` : 'ไม่รัด'}`);
  return numberLines(lines, v.extraItems, prefix);
}

// Filters to checked items and auto-numbers them ("3.1", "3.2", ...) — real POs show a plain
// numbered list, never checkbox glyphs or unchecked items, so print output follows that.
export function formatRequirementLines(items: RequirementItem[], prefix: string): string[] {
  return items
    .filter((item) => item.checked && item.text.trim())
    .map((item, i) => `${prefix}.${i + 1} ${item.text.trim()}`);
}
