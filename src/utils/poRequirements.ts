import type { ProductSpecDetail, PackingDetail, LoadingRequirement, DocumentRequirement, RequirementItem } from '../types';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyProductSpec(): ProductSpecDetail {
  return {
    productForm: '', standardCustomer: '', standardCode: '', colorSizePlus: '',
    netWeightGrams: '', boxWeightGrams: '', afterGlazeWeightGrams: '',
    glazePercent: '', glazeMethod: '',
    extraItems: [],
  };
}

export function emptyPackingDetail(): PackingDetail {
  return {
    innerBoxWidthMm: '', innerBoxLengthMm: '', innerBoxHeightMm: '', innerBoxCode: '',
    topLidItems: [], bottomLidItems: [],
    outerBoxDesc: '', outerBoxWidthMm: '', outerBoxLengthMm: '', outerBoxHeightMm: '', outerBoxCode: '',
    outerBoxItems: [],
    strapped: false, strappingColors: [], strappingCount: '', strappingStyle: '',
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

// Backward-compat adapter for ProductSpecDetail — old rows may still carry the removed
// standard/color free-text fields (or netWeightWidthMm/LengthMm/HeightMm before that) instead
// of today's shape; those are simply dropped (not reliably convertible into the new dropdowns).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProductSpec(raw: any): ProductSpecDetail {
  const base = emptyProductSpec();
  if (!raw || typeof raw !== 'object') return base;
  return {
    productForm: raw.productForm === 'cooked' || raw.productForm === 'raw' ? raw.productForm : base.productForm,
    standardCustomer: typeof raw.standardCustomer === 'string' ? raw.standardCustomer : base.standardCustomer,
    standardCode: typeof raw.standardCode === 'string' ? raw.standardCode : base.standardCode,
    colorSizePlus: typeof raw.colorSizePlus === 'string' ? raw.colorSizePlus : base.colorSizePlus,
    netWeightGrams: typeof raw.netWeightGrams === 'string' ? raw.netWeightGrams : base.netWeightGrams,
    boxWeightGrams: typeof raw.boxWeightGrams === 'string' ? raw.boxWeightGrams : base.boxWeightGrams,
    afterGlazeWeightGrams: typeof raw.afterGlazeWeightGrams === 'string' ? raw.afterGlazeWeightGrams : base.afterGlazeWeightGrams,
    glazePercent: typeof raw.glazePercent === 'string' ? raw.glazePercent : base.glazePercent,
    glazeMethod: typeof raw.glazeMethod === 'string' ? raw.glazeMethod : base.glazeMethod,
    extraItems: normalizeRequirementItems(raw.extraItems ?? []),
  };
}

// Converts the old fixed ฝาบน/ฝาล่าง/outer-box fields (checklist text + stamp code + a
// boolean or two) into equivalent list items, so admins who already filled those in in an
// earlier session don't silently lose that text when the row is next opened.
function legacyTopLidItems(checklist?: string, stampCode?: string, stampDate?: boolean): RequirementItem[] {
  const items: RequirementItem[] = [];
  if (checklist) items.push({ id: uid(), checked: true, text: `กาเครื่องหมายถูกต้องที่ช่อง: ${checklist}` });
  if (stampCode) items.push({ id: uid(), checked: true, text: `stamp code ${stampCode}` });
  if (stampDate) items.push({ id: uid(), checked: true, text: 'stamp Production date : YYYY.MM.DD' });
  return items;
}

function legacyBottomLidItems(bottomLidType?: string, bottomLidDetail?: string): RequirementItem[] {
  if (bottomLidType === 'printed') return [{ id: uid(), checked: true, text: `พิมพ์ระบุ${bottomLidDetail ? ` ${bottomLidDetail}` : ''}` }];
  if (bottomLidType === 'blank') return [{ id: uid(), checked: true, text: 'ไม่มีข้อความใดๆ' }];
  return [];
}

function legacyOuterBoxItems(checklist?: string, stampCode?: string, dateMatchInner?: boolean): RequirementItem[] {
  const items: RequirementItem[] = [];
  if (checklist) items.push({ id: uid(), checked: true, text: `กาเครื่องหมายถูกต้องที่ช่อง: ${checklist}` });
  if (stampCode) items.push({ id: uid(), checked: true, text: `stamp code ${stampCode}` });
  if (dateMatchInner) items.push({ id: uid(), checked: true, text: 'วันผลิตและวันหมดอายุตรงกับกล่องอินเนอร์' });
  return items;
}

// Backward-compat adapter for PackingDetail — old rows may carry the removed fixed fields
// (topLidChecklist/topLidStampCode/topLidStampDate, bottomLidType/bottomLidDetail,
// outerBoxType, outerBoxChecklist/outerBoxStampCode/outerBoxDateMatchInner) instead of today's
// topLidItems/bottomLidItems/outerBoxDesc/outerBoxItems. Without this, PackingDetailFields and
// buildPackingDetailBlock would call .map/.filter on undefined and crash the PO/Brand pages.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePackingDetail(raw: any): PackingDetail {
  const base = emptyPackingDetail();
  if (!raw || typeof raw !== 'object') return base;
  return {
    innerBoxWidthMm: typeof raw.innerBoxWidthMm === 'string' ? raw.innerBoxWidthMm : base.innerBoxWidthMm,
    innerBoxLengthMm: typeof raw.innerBoxLengthMm === 'string' ? raw.innerBoxLengthMm : base.innerBoxLengthMm,
    innerBoxHeightMm: typeof raw.innerBoxHeightMm === 'string' ? raw.innerBoxHeightMm : base.innerBoxHeightMm,
    innerBoxCode: typeof raw.innerBoxCode === 'string' ? raw.innerBoxCode : base.innerBoxCode,
    topLidItems: Array.isArray(raw.topLidItems)
      ? normalizeRequirementItems(raw.topLidItems)
      : legacyTopLidItems(raw.topLidChecklist, raw.topLidStampCode, raw.topLidStampDate),
    bottomLidItems: Array.isArray(raw.bottomLidItems)
      ? normalizeRequirementItems(raw.bottomLidItems)
      : legacyBottomLidItems(raw.bottomLidType, raw.bottomLidDetail),
    outerBoxDesc: typeof raw.outerBoxDesc === 'string' ? raw.outerBoxDesc : (typeof raw.outerBoxType === 'string' ? raw.outerBoxType : base.outerBoxDesc),
    outerBoxWidthMm: typeof raw.outerBoxWidthMm === 'string' ? raw.outerBoxWidthMm : base.outerBoxWidthMm,
    outerBoxLengthMm: typeof raw.outerBoxLengthMm === 'string' ? raw.outerBoxLengthMm : base.outerBoxLengthMm,
    outerBoxHeightMm: typeof raw.outerBoxHeightMm === 'string' ? raw.outerBoxHeightMm : base.outerBoxHeightMm,
    outerBoxCode: typeof raw.outerBoxCode === 'string' ? raw.outerBoxCode : base.outerBoxCode,
    outerBoxItems: Array.isArray(raw.outerBoxItems)
      ? normalizeRequirementItems(raw.outerBoxItems)
      : legacyOuterBoxItems(raw.outerBoxChecklist, raw.outerBoxStampCode, raw.outerBoxDateMatchInner),
    strapped: Boolean(raw.strapped),
    // Older records stored a single colour in `strappingColor`.
    strappingColors: Array.isArray(raw.strappingColors)
      ? raw.strappingColors.map((c: unknown) => (typeof c === 'string' ? c : ''))
      : typeof raw.strappingColor === 'string' && raw.strappingColor ? [raw.strappingColor] : [],
    strappingCount: typeof raw.strappingCount === 'string' ? raw.strappingCount : '',
    strappingStyle: typeof raw.strappingStyle === 'string' ? raw.strappingStyle : '',
    extraItems: normalizeRequirementItems(raw.extraItems ?? []),
  };
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

// "กุ้งต้ม" / "กุ้งดิบ" — the noun phrase reused across the มาตรฐาน/สี lines here and the
// ข้อ 2.1 inner-box headline, so productForm is only ever selected once per product.
export function productFormLabel(form: ProductSpecDetail['productForm']): string {
  return form === 'cooked' ? 'กุ้งต้ม' : form === 'raw' ? 'กุ้งดิบ' : '';
}

export function formatProductSpecLines(v: ProductSpecDetail, prefix: string): string[] {
  const lines: string[] = [];
  const formLabel = productFormLabel(v.productForm);
  if (formLabel) {
    let line = `มาตรฐานการผลิต${formLabel}`;
    if (v.standardCustomer) line += ` ลูกค้า${v.standardCustomer}`;
    if (v.standardCode) line += ` ตาม Production STD : QA.STD.${v.standardCode}`;
    lines.push(line);
  }
  if (formLabel || v.colorSizePlus) {
    const colorParts = [formLabel, v.colorSizePlus && `${v.colorSizePlus}+`].filter(Boolean);
    lines.push(`สี : ${colorParts.join(' ')}`);
  }
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
// form preview and the printed line can never drift out of sync. The inner-box headline is
// fully auto-composed from productForm (ข้อ 1) + brand, so it's never typed a second time;
// the outer box's own free-text description (box material, e.g. "ลูกฟูกขาว") stays manual.
export interface BoxLineContext { productForm: ProductSpecDetail['productForm']; brand: string; netWeightGrams: string; }

export function composeInnerBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.innerBoxWidthMm || '-'}x${v.innerBoxLengthMm || '-'}x${v.innerBoxHeightMm || '-'}`;
  const desc = productFormLabel(ctx.productForm) || '-';
  return `อินเนอร์${desc}${ctx.brand ? ` (${ctx.brand})` : ''} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.innerBoxCode || '-'}`;
}

export function composeOuterBoxLine(v: PackingDetail, ctx: BoxLineContext): string {
  const size = `${v.outerBoxWidthMm || '-'}x${v.outerBoxLengthMm || '-'}x${v.outerBoxHeightMm || '-'}`;
  return `กล่องนอก${v.outerBoxDesc || '-'} ${ctx.netWeightGrams || '-'} กรัม ขนาด ${size} mm. รหัส : ${v.outerBoxCode || '-'}`;
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

// A PO can carry several outer-box codes joined by " / " (see BoxCodeInput).
export function splitBoxCodes(code: string): string[] {
  return code.split('/').map((c) => c.trim()).filter(Boolean);
}

// "เชือกสายรัด: รัด M-A01-R-03-R4 สีขาว M-A01-R-03-R5 สีส้ม จำนวน 2 เส้น ลักษณะ กากบาท" — one
// colour per outer-box code; the count is left out entirely when not filled in.
function composeStrapLine(v: PackingDetail): string {
  const codes = splitBoxCodes(v.outerBoxCode);
  const colorAt = (i: number) => v.strappingColors[i]?.trim() || '-';
  const colors = codes.length > 0
    ? codes.map((code, i) => `${code} สี${colorAt(i)}`).join(' ')
    : `สี ${colorAt(0)}`;
  const count = v.strappingCount.trim() ? ` จำนวน ${v.strappingCount.trim()} เส้น` : '';
  return `เชือกสายรัด: รัด ${colors}${count} ลักษณะ ${v.strappingStyle || '-'}`;
}

export function buildPackingDetailBlock(v: PackingDetail, prefix: string, ctx: BoxLineContext): PackingDetailBlock {
  const hasInner = ctx.productForm || v.innerBoxWidthMm || v.innerBoxLengthMm || v.innerBoxHeightMm || v.innerBoxCode;
  const hasOuter = v.outerBoxDesc || v.outerBoxWidthMm || v.outerBoxLengthMm || v.outerBoxHeightMm || v.outerBoxCode;
  let n = 0;
  const innerHeadline = hasInner ? `${prefix}.${++n} ${composeInnerBoxLine(v, ctx)}` : null;
  const outerHeadline = hasOuter ? `${prefix}.${++n} ${composeOuterBoxLine(v, ctx)}` : null;

  const tailSources = [
    v.strapped ? composeStrapLine(v) : 'เชือกสายรัด: ไม่รัด',
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
