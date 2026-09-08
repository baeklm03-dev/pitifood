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
    innerBoxDesc: '', innerBoxWidthMm: '', innerBoxLengthMm: '', innerBoxHeightMm: '', innerBoxCode: '',
    topLidItems: [], bottomLidItems: [],
    outerBoxDesc: '', outerBoxWidthMm: '', outerBoxLengthMm: '', outerBoxHeightMm: '', outerBoxCode: '',
    outerBoxItems: [],
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

// Shared by the PackingDetailFields live preview and buildPackingDetailBlock below, so the
// form preview and the printed line can never drift out of sync.
export interface BoxLineContext { netWeightGrams: string; }

export function composeInnerBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.innerBoxWidthMm || '-'}x${v.innerBoxLengthMm || '-'}x${v.innerBoxHeightMm || '-'}`;
  return `${v.innerBoxDesc || '-'} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.innerBoxCode || '-'}`;
}

export function composeOuterBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.outerBoxWidthMm || '-'}x${v.outerBoxLengthMm || '-'}x${v.outerBoxHeightMm || '-'}`;
  return `${v.outerBoxDesc || '-'} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.outerBoxCode || '-'}`;
}

function checkedTexts(items: RequirementItem[]): string[] {
  return items.filter((item) => item.checked && item.text.trim()).map((item) => item.text.trim());
}

// Structured packing-detail output for print — 2.1 (inner box) and 2.2 (outer box) are each a
// numbered headline with their own unnumbered "- " sub-bullets nested under them (ฝาบน/ฝาล่าง for
// inner, a flat list for outer); strap info + any custom extra items continue the numbering
// afterward (2.3, 2.4, ...). Kept structured (not a flat string[]) so the print layout can render
// the ฝาบน/ฝาล่าง group labels underlined — see POPrint.tsx.
export interface PackingDetailBlock {
  innerHeadline: string | null;
  topLidLines: string[];
  bottomLidLines: string[];
  outerHeadline: string | null;
  outerLines: string[];
  tailLines: string[];
}

export function buildPackingDetailBlock(v: PackingDetail, prefix: string, ctx: BoxLineContext): PackingDetailBlock {
  const hasInner = v.innerBoxDesc || v.innerBoxWidthMm || v.innerBoxLengthMm || v.innerBoxHeightMm || v.innerBoxCode;
  const hasOuter = v.outerBoxDesc || v.outerBoxWidthMm || v.outerBoxLengthMm || v.outerBoxHeightMm || v.outerBoxCode;
  let n = 0;
  const innerHeadline = hasInner ? `${prefix}.${++n} ${composeInnerBoxLine(v, ctx)}` : null;
  const outerHeadline = hasOuter ? `${prefix}.${++n} ${composeOuterBoxLine(v, ctx)}` : null;

  const tailSources = [
    v.strapped ? `เชือกสายรัด: รัด สี ${v.strappingColor || '-'} ลักษณะ ${v.strappingStyle || '-'}` : 'เชือกสายรัด: ไม่รัด',
    ...checkedTexts(v.extraItems ?? []),
  ];
  const tailLines = tailSources.map((line) => `${prefix}.${++n} ${line}`);

  return {
    innerHeadline,
    topLidLines: checkedTexts(v.topLidItems),
    bottomLidLines: checkedTexts(v.bottomLidItems),
    outerHeadline,
    outerLines: checkedTexts(v.outerBoxItems),
    tailLines,
  };
}

// Flat text-only rendering of a packing block — used by read-only summary views (Brand/Buyer
// pages) where the ฝาบน/ฝาล่าง underline styling doesn't matter, just the content.
export function formatPackingDetailLines(v: PackingDetail, prefix: string, ctx: BoxLineContext): string[] {
  const block = buildPackingDetailBlock(v, prefix, ctx);
  const lines: string[] = [];
  if (block.innerHeadline) {
    lines.push(block.innerHeadline);
    if (block.topLidLines.length) { lines.push('ฝาบน'); block.topLidLines.forEach((t) => lines.push(`- ${t}`)); }
    if (block.bottomLidLines.length) { lines.push('ฝาล่าง'); block.bottomLidLines.forEach((t) => lines.push(`- ${t}`)); }
  }
  if (block.outerHeadline) {
    lines.push(block.outerHeadline);
    block.outerLines.forEach((t) => lines.push(`- ${t}`));
  }
  lines.push(...block.tailLines);
  return lines;
}

// Filters to checked items and auto-numbers them ("3.1", "3.2", ...) — real POs show a plain
// numbered list, never checkbox glyphs or unchecked items, so print output follows that.
export function formatRequirementLines(items: RequirementItem[], prefix: string): string[] {
  return items
    .filter((item) => item.checked && item.text.trim())
    .map((item, i) => `${prefix}.${i + 1} ${item.text.trim()}`);
}
