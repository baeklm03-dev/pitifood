// ─── Users ───────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface SessionUser {
  userId: string;
  role: UserRole;
  fullName: string;
  username: string;
}

// ─── Buyers ──────────────────────────────────────────────
export interface SubCompany {
  id: string;
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}

export interface Buyer {
  id: string;
  code: string;
  companyName: string;
  address?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  paymentTerms: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  incoterm?: string;
  loadingRequirement: LoadingRequirement;      // PO requirement — loading (ข้อ 3)
  loadingRequirementRemark?: string;
  documentRequirement: DocumentRequirement;    // PO requirement — documents (ข้อ 4)
  documentRequirementRemark?: string;
  productTypeNameOverrides?: Record<string, string>; // per-buyer commodity name overrides, keyed by product type code
  hasSubCompanies: boolean;
  subCompanies: SubCompany[];
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── PO requirement fields (ข้อกำหนดอื่นๆ) — fixed schema, one per topic ──
export interface ProductSpecDetail {
  standard: string;            // มาตรฐาน
  color: string;                // สี (free text, e.g. "กุ้งต้ม 24+")
  netWeightWidthMm: string;
  netWeightLengthMm: string;
  netWeightHeightMm: string;    // น้ำหนัก (Net weight) กว้าง x ยาว x สูง mm
  boxWeightGrams: string;       // น้ำหนัก (ระบุบนกล่อง) ...กรัม
  glazePercent: string;         // เคลือบน้ำ ...%
  glazeMethod: string;          // วิธีเคลือบน้ำ ...
}

export interface PackingDetail {
  innerBoxDesc: string;         // กล่องอินเนอร์: กุ้ง...
  innerBoxCode: string;         // รหัสกล่อง...
  topLidChecklist: string;      // ฝาบน: กาเครื่องหมายถูกต้องที่ช่อง (free text)
  topLidStampCode: string;      // stamp code 12 หลัก
  topLidStampDate: boolean;     // ประทับ Production date รูปแบบ YYYY.MM.DD
  bottomLidType: 'printed' | 'blank'; // ฝาล่าง: พิมพ์ระบุ / ไม่มีข้อความใดๆ
  bottomLidDetail: string;      // ใช้เมื่อ bottomLidType === 'printed'
  outerBoxType: string;         // กล่องนอก: กล่องแบบไหน เช่น ลูกฟูกขาว
  outerBoxCode: string;
  outerBoxChecklist: string;    // free text
  outerBoxStampCode: string;
  outerBoxDateMatchInner: boolean; // วันผลิต/วันหมดอายุตรงกับกล่องอินเนอร์
  strapped: boolean;            // เชือกสายรัด: รัด / ไม่รัด
  strappingColor: string;       // ใช้เมื่อ strapped === true
  strappingStyle: string;       // ลักษณะการรัด
}

export interface LoadingRequirement {
  temperatureRecorder: boolean; // กำหนดใส่ Temperature Recorder ในตู้สินค้า
}

export interface DocumentRequirement {
  photoInnerBoxCorrugated: boolean;   // ภาพถ่ายกล่องอินเนอร์และลูกฟูกเมื่อมาถึงโรงงาน
  inspectionReport: boolean;          // Finished Product Inspection Report ตามแบบฟอร์มลูกค้า
  loadingReport: boolean;             // รายงานการโหลด (รายการ/วันหมดอายุ/lot/ภาพถ่าย/ตำแหน่ง)
}

// ─── Brands ──────────────────────────────────────────────
export interface Brand {
  id: string;
  brandName: string;
  buyerId: string;
  buyerCode: string;
  productTypes: string[];   // product types this brand can be used for (empty = any)
  packingSizes: string[];   // available packing sizes for this brand
  productSpec: ProductSpecDetail;       // PO requirement — product spec (ข้อ 1)
  productSpecRemark?: string;
  packingDetail: PackingDetail;         // PO requirement — packing detail (ข้อ 2)
  packingDetailRemark?: string;
  defaultPacking?: string;  // legacy — kept for backward-compat
  defaultOrigin?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sale Contract (Phase 2) ─────────────────────────────
export type ContractStatus = 'draft' | 'finalized' | 'signed';

export interface ProductLine {
  id: string;
  productType: string;
  size: string;
  sizeUnit: 'kg' | 'Lb';
  brand: string;
  packing: string;
  quantity: number;
  netWeightPerCarton: number;
  unitPrice: number;
  totalWeight: number;
  totalAmount: number;
}

export interface Signatory {
  label: string;
  fullName: string;
  title?: string;
}

export type ShipmentPeriod = 'early' | 'mid' | 'late';

export interface SaleContract {
  id: string;
  contractNo: string;
  buyerId: string;
  buyerCode: string;
  buyerName: string;
  subCompanyId?: string;
  subCompanyName?: string;
  offerDate: string;
  shipmentPeriod?: ShipmentPeriod;
  shipmentMonth?: number;
  shipmentYear?: number;
  portOfLoading?: string;
  portOfDischarge?: string;
  incoterm?: string;
  paymentTerms: string;
  containerQty?: number;
  containerType?: string;
  packingStyle?: string;
  productLines: ProductLine[];
  signatories: Signatory[];
  remarks?: string;
  status: ContractStatus;
  isLocked: boolean;
  signedFileUrl?: string;
  signedFileName?: string;
  signedAt?: string;
  parentContractId?: string;
  revision: number;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Production Order (Phase 5) ──────────────────────────
export type POStatus = 'draft' | 'finalized';

export interface POLine {
  id: string;
  productType: string;  // from SC
  brand?: string;        // from SC — identifies which brand's requirement block (below) applies
  size: string;         // from SC
  packing: string;      // from SC
  mark: string;         // PO-specific
  sizeRm: string;       // PO-specific (size r/m)
  qtyCtn: number;       // cartons (from SC, editable)
  qtyKg: number;        // net weight kg (from SC, editable)
  inStock: number;      // manual
  produceAdd: number;   // manual
}

// ข้อ 1 (product spec) + ข้อ 2 (packing detail), one block per distinct product+brand
// on the PO — a PO covering multiple products/brands gets its own requirements per one.
export interface ProductRequirement {
  id: string;
  productType: string;
  brand?: string;
  productSpec: ProductSpecDetail;
  productSpecRemark?: string;
  packingDetail: PackingDetail;
  packingDetailRemark?: string;
}

export interface ProductionOrder {
  id: string;
  poNo: string;
  contractId: string;
  contractNo: string;
  buyerId?: string;
  buyerName?: string;
  subCompanyName?: string;
  destination?: string;
  attn?: string;
  poDate: string;
  deliveryNote?: string;          // กำหนดส่งมอบ
  productRequirements: ProductRequirement[]; // ข้อ 1-2 per product (default from brand)
  loadingRequirement: LoadingRequirement; // ข้อ 3 (default from buyer)
  loadingRequirementRemark?: string;
  documentRequirement: DocumentRequirement; // ข้อ 4 (default from buyer)
  documentRequirementRemark?: string;
  preparedBy?: string;
  approvedBy?: string;
  lines: POLine[];
  status: POStatus;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}
