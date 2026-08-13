import type { ProductSpecDetail, PackingDetail, LoadingRequirement, DocumentRequirement } from '../types';

export function emptyProductSpec(): ProductSpecDetail {
  return {
    standard: '', color: '',
    netWeightWidthMm: '', netWeightLengthMm: '', netWeightHeightMm: '',
    boxWeightGrams: '', glazePercent: '', glazeMethod: '',
  };
}

export function emptyPackingDetail(): PackingDetail {
  return {
    innerBoxDesc: '', innerBoxCode: '',
    topLidChecklist: '', topLidStampCode: '', topLidStampDate: false,
    bottomLidType: 'blank', bottomLidDetail: '',
    outerBoxType: '', outerBoxCode: '', outerBoxChecklist: '', outerBoxStampCode: '', outerBoxDateMatchInner: false,
    strapped: false, strappingColor: '', strappingStyle: '',
  };
}

export function emptyLoadingRequirement(): LoadingRequirement {
  return { temperatureRecorder: false };
}

export function emptyDocumentRequirement(): DocumentRequirement {
  return { photoInnerBoxCorrugated: false, inspectionReport: false, loadingReport: false };
}

// Formats each section's structured fields as flowing text lines, skipping fields that
// were never filled in — used by both the PO print layout and the Brand/Buyer read-only
// view pages so the two never drift apart.

export function formatProductSpecLines(v: ProductSpecDetail): string[] {
  const lines: string[] = [];
  if (v.standard) lines.push(`มาตรฐาน: ${v.standard}`);
  if (v.color) lines.push(`สี: ${v.color}`);
  if (v.netWeightWidthMm || v.netWeightLengthMm || v.netWeightHeightMm) {
    lines.push(`น้ำหนัก (Net weight) ขนาด ${v.netWeightWidthMm || '-'} x ${v.netWeightLengthMm || '-'} x ${v.netWeightHeightMm || '-'} mm`);
  }
  if (v.boxWeightGrams || v.glazePercent || v.glazeMethod) {
    const parts = [
      v.boxWeightGrams && `${v.boxWeightGrams} กรัม`,
      v.glazePercent && `เคลือบน้ำ ${v.glazePercent}%`,
      v.glazeMethod && `วิธีเคลือบน้ำ ${v.glazeMethod}`,
    ].filter(Boolean);
    lines.push(`น้ำหนัก (ระบุบนกล่อง) ${parts.join(' ')}`);
  }
  return lines;
}

export function formatPackingDetailLines(v: PackingDetail): string[] {
  const lines: string[] = [];
  if (v.innerBoxDesc || v.innerBoxCode) {
    lines.push(`กล่องอินเนอร์: ${v.innerBoxDesc || '-'}${v.innerBoxCode ? ` รหัสกล่อง ${v.innerBoxCode}` : ''}`);
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
  if (v.outerBoxType || v.outerBoxCode) {
    lines.push(`กล่องนอก: ${v.outerBoxType || '-'}${v.outerBoxCode ? ` รหัสกล่อง ${v.outerBoxCode}` : ''}`);
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
  return lines;
}

export function formatLoadingRequirementLines(v: LoadingRequirement): string[] {
  return v.temperatureRecorder
    ? ['☑ กำหนดใส่ Temperature Recorder ในตู้สินค้า (ให้ระบุหมายเลขอุณหภูมิใน B/L และใน packing list)']
    : [];
}

export function formatDocumentRequirementLines(v: DocumentRequirement): string[] {
  return [
    `${v.photoInnerBoxCorrugated ? '☑' : '☐'} ภาพถ่ายกล่องอินเนอร์ และลูกฟูก เมื่อกล่องมาถึงโรงงาน`,
    `${v.inspectionReport ? '☑' : '☐'} จัดทำ Finished Product Inspection Report ตามแบบฟอร์มที่ลูกค้ากำหนด`,
    `${v.loadingReport ? '☑' : '☐'} จัดทำรายงานการโหลด ระบุรายละเอียด รายการสินค้า, วันหมดอายุ, lot number, ภาพถ่ายสินค้าระหว่างโหลด และตำแหน่ง`,
  ];
}
