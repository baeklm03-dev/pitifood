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
  hasSubCompanies: boolean;
  subCompanies: SubCompany[];
  createdAt: string;
  updatedAt: string;
}

// ─── Brands ──────────────────────────────────────────────
export interface Brand {
  id: string;
  brandName: string;
  buyerId: string;
  buyerCode: string;
  defaultPacking?: string;
  defaultOrigin?: string;
  defaultSpec?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Sale Contract (Phase 2) ─────────────────────────────
export type ContractStatus = 'draft' | 'finalized' | 'signed' | 'locked';

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
  eta?: string;
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
  createdAt: string;
  updatedAt: string;
}
