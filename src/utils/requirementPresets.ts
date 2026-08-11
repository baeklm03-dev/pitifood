import type { RequirementRow } from '../types';

// Quick-pick suggestions for "รายการ" (label) inputs in RequirementRows editors,
// matching the row names used in "PO new format.xlsx".
export const PRODUCT_SPEC_PRESETS = ['มาตรฐาน', 'สี', 'น้ำหนัก (Net weight)', 'น้ำหนัก (ระบุบนกล่อง)', 'น้ำหนัก (หลังเคลือบน้ำ)'];
export const PACKING_DETAIL_PRESETS = ['ขนาด (กล่องอินเนอร์)', 'แบรนด์', 'ฝาบน', 'ฝาล่าง', 'ขนาด (กล่องนอก)', 'สี (เชือกสายรัด)', 'จำนวน (เชือกสายรัด)', 'ลักษณะการรัด'];
export const LOADING_REQUIREMENT_PRESETS = ['Temperature Recorder', 'ลำดับการโหลดสินค้า', 'สินค้าตัวอย่างสำหรับศุลกากร'];
export const DOCUMENT_REQUIREMENT_PRESETS = ['ภาพถ่ายกล่อง', 'ภาพถ่ายสินค้า', 'รายงานการโหลด'];

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Starter rows for a brand-new record — pre-fills the main Sheet1 items with blank
// details so the admin only fills in values, but every row stays freely deletable.
export function defaultRowsFrom(labels: string[]): RequirementRow[] {
  return labels.map((label) => ({ id: uid(), label, detail: '' }));
}
