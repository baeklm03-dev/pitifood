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
export type ProductForm = 'cooked' | 'raw' | '';

export interface ProductSpecDetail {
  productForm: ProductForm;      // กุ้งต้ม / กุ้งดิบ — drives the มาตรฐาน/สี lines below and the
                                  // ข้อ 2.1 inner-box headline (so it's only selected once)
  standardCustomer: string;      // มาตรฐาน — "ลูกค้า..." (optional, e.g. "ไต้หวัน")
  standardCode: string;          // มาตรฐาน — suffix after the fixed "QA.STD." prefix (e.g. "TW.003")
  colorSizePlus: string;         // สี — the "NN+" size number (dropdown 22-30, or custom)
  netWeightGrams: string;        // N.W. (ก่อนเคลือบน้ำ) — reused by the ข้อ 2.1/2.2 box headlines
  boxWeightGrams: string;        // น้ำหนัก (ระบุบนกล่อง) ...กรัม
  afterGlazeWeightGrams: string; // หลังเคลือบน้ำ — free text ("1000g+", "1,000g up", ...)
  glazePercent: string;          // เคลือบน้ำ ...% (alternate way some POs express glazing)
  glazeMethod: string;           // วิธีการเคลือบ ...
  extraItems?: RequirementItem[]; // custom numbered sub-items appended after the fixed ones (1.4+)
}

export interface PackingDetail {
  innerBoxWidthMm: string;
  innerBoxLengthMm: string;
  innerBoxHeightMm: string;     // กล่องอินเนอร์ ขนาด กว้าง x ยาว x สูง mm
  innerBoxCode: string;         // รหัสกล่อง (I-...) — see BoxCodeInput
  topLidItems: RequirementItem[];    // ฝาบน — addable free lines (e.g. stamp/checklist notes)
  bottomLidItems: RequirementItem[]; // ฝาล่าง — addable free lines
  outerBoxDesc: string;         // กล่องนอก — box type/material, free text (e.g. "ลูกฟูกขาว")
  outerBoxWidthMm: string;
  outerBoxLengthMm: string;
  outerBoxHeightMm: string;     // กล่องนอก ขนาด กว้าง x ยาว x สูง mm
  outerBoxCode: string;         // รหัสกล่อง (M-...) — see BoxCodeInput
  outerBoxItems: RequirementItem[];  // กล่องนอก — addable free lines (flat, no ฝาบน/ฝาล่าง split)
  strapped: boolean;            // เชือกสายรัด: รัด / ไม่รัด
  strappingColor: string;       // ใช้เมื่อ strapped === true
  strappingCount: string;       // จำนวนเส้น — ใช้เมื่อ strapped === true
  strappingStyle: string;       // ลักษณะการรัด
  extraItems?: RequirementItem[]; // custom numbered sub-items appended after the fixed ones (2.5+)
}

// Loading requirement (ข้อ 3) and document requirement (ข้อ 4) are free-length checklists —
// real POs show anywhere from 1 to 5 differently-worded numbered items per section, so both
// are just an ordered list of lines rather than a fixed set of named booleans.
export interface RequirementItem {
  id: string;
  text: string;
  checked: boolean; // included on print when true
}

export type LoadingRequirement = RequirementItem[];
export type DocumentRequirement = RequirementItem[];

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

// 'custom_sale_contract' prints identically to 'sale_contract' (title stays "Sales Contract")
// but is numbered independently ("... CS.N"), like 'proforma_invoice' — a separate editable
// copy (e.g. to offer a custom price) that doesn't touch the Rewrite rev. sequence.
export type ContractDocType = 'sale_contract' | 'proforma_invoice' | 'custom_sale_contract';

export interface SaleContract {
  id: string;
  contractNo: string;
  docType: ContractDocType;
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
  currency?: string;
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
  produceAdd: number;   // derived: max(0, qtyKg − inStock)
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
